"use client";
import { decodeRenderUrl } from "../render-url";
import type { GarmentType, Generation, LookOptions, PublicAppConfig } from "../types";
import { blobToDataUrl } from "./image";
import { renderMockPhoto } from "./render";
import type { NewImage, Repo } from "./repo";

export type GarmentChoice =
  | { kind: "sample"; sampleId: string; garmentType: GarmentType; preview: string }
  | { kind: "upload"; uploadId: string; garmentType: GarmentType; preview: string };

export class JobError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function deviceId() {
  let id = localStorage.getItem("ds_device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ds_device", id);
  }
  return id;
}

/** fetch with automatic retries for flaky 3G — calls onSlow so the UI can say "Internet is slow…" */
async function postJson(url: string, body: unknown, onSlow?: () => void, tries = 4): Promise<{ status: number; data: Record<string, unknown> }> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-device-id": deviceId() },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503 || res.status === 504) throw new Error("RETRY");
      return { status: res.status, data };
    } catch (e) {
      lastErr = e;
      onSlow?.();
      await sleep(1500 * (i + 1));
    }
  }
  throw lastErr instanceof Error && lastErr.message !== "RETRY" ? new JobError("NETWORK") : new JobError("NETWORK");
}

interface StartArgs {
  repo: Repo;
  config: PublicAppConfig;
  garment: GarmentChoice;
  look: LookOptions;
  count: number;
  variants?: number[];
  onSlow?: () => void;
}

/** Ask the server to start a job. Local wallets pay first and get refunded if the start fails. */
async function requestJob({ repo, config, garment, look, count, variants, onSlow }: StartArgs) {
  if (repo.kind === "local") {
    try {
      await repo.spendCredits(count);
    } catch {
      throw new JobError("NO_CREDITS");
    }
  }
  try {
    let garmentImage: string | undefined;
    if (garment.kind === "upload" && config.provider === "real") {
      const blob = await repo.getUploadBlob(garment.uploadId);
      if (blob) garmentImage = await blobToDataUrl(blob);
    }
    const { status, data } = await postJson(
      "/api/generate",
      {
        garmentType: garment.garmentType,
        look,
        count,
        variants,
        sampleId: garment.kind === "sample" ? garment.sampleId : undefined,
        uploadId: garment.kind === "upload" && repo.kind === "cloud" ? garment.uploadId : undefined,
        garmentImage,
      },
      onSlow,
    );
    if (status !== 200) throw new JobError(String(data.error ?? "SERVER"));
    return { jobId: data.jobId as string, serverId: (data.generationId as string | null) ?? null };
  } catch (e) {
    if (repo.kind === "local") await repo.addCredits(count);
    throw e instanceof JobError ? e : new JobError("SERVER");
  }
}

export async function startPhotos(args: Omit<StartArgs, "count" | "variants">): Promise<string> {
  const count = 4;
  const { jobId, serverId } = await requestJob({ ...args, count });
  const gen = await args.repo.createGeneration({
    garmentType: args.garment.garmentType,
    look: args.look,
    source: args.garment.kind === "sample" ? { kind: "sample", sampleId: args.garment.sampleId } : { kind: "upload", uploadId: args.garment.uploadId },
    jobId,
    serverId,
    creditsUsed: count,
    garmentThumb: args.garment.preview,
  });
  return gen.id;
}

export interface PollUpdate {
  progress: number;
  slow?: boolean;
}

interface PollArgs {
  repo: Repo;
  gen: Pick<Generation, "id" | "garmentType" | "look" | "source" | "creditsUsed">;
  jobId: string;
  serverId?: string | null;
  count: number;
  variants?: number[];
  onUpdate: (u: PollUpdate) => void;
  signal: { cancelled: boolean };
}

/** Poll every 2 s until done, then turn the result URLs into stored images. */
async function pollJob({ repo, gen, jobId, serverId, count, variants, onUpdate, signal }: PollArgs) {
  let current = jobId;
  let note: Generation["note"] = null;
  for (let i = 0; i < 200 && !signal.cancelled; i++) {
    let res: { status: number; data: Record<string, unknown> };
    try {
      res = await postJson(
        "/api/generate/status",
        { jobId: current, generationId: serverId, garmentType: gen.garmentType, look: gen.look, count, variants },
        () => onUpdate({ progress: -1, slow: true }),
        3,
      );
    } catch {
      onUpdate({ progress: -1, slow: true });
      await sleep(3000);
      continue;
    }
    const d = res.data;
    if (typeof d.jobId === "string" && d.jobId !== current) {
      current = d.jobId; // real AI failed → server restarted the job on demo photos
      note = "fallback";
      await repo.updateGeneration(gen.id, { jobId: current, note });
    }
    if (d.status === "done") {
      onUpdate({ progress: 99 });
      const urls = (d.imageUrls as string[]) ?? [];
      if (d.note) note = d.note as Generation["note"];
      return { ok: true as const, images: await resolveImages(repo, gen, urls), note };
    }
    if (d.status === "failed") return { ok: false as const, error: String(d.error ?? "FAILED") };
    onUpdate({ progress: typeof d.progress === "number" ? d.progress : 5 });
    await sleep(2000);
  }
  return { ok: false as const, error: signal.cancelled ? "CANCELLED" : "TIMEOUT" };
}

async function resolveImages(repo: Repo, gen: PollArgs["gen"], urls: string[]): Promise<NewImage[]> {
  let garmentBlob: Blob | null = null;
  const out: NewImage[] = [];
  for (const url of urls) {
    const spec = decodeRenderUrl(url);
    if (spec) {
      if (!garmentBlob && gen.source.kind === "upload") garmentBlob = await repo.getUploadBlob(gen.source.uploadId);
      if (garmentBlob) out.push({ blob: await renderMockPhoto(spec, garmentBlob) });
    } else if (url.startsWith("/")) {
      out.push({ src: url });
    } else {
      // real AI output: copy it now — provider links expire after a few days
      const r = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
      if (r.ok) out.push({ blob: await r.blob() });
    }
  }
  return out;
}

/** Runs (or resumes) a whole generation. Safe to call again after a reload — job tokens are stateless. */
export async function runGeneration(repo: Repo, gen: Generation, onUpdate: (u: PollUpdate) => void, signal: { cancelled: boolean }) {
  if (!gen.jobId) throw new JobError("NO_JOB");
  const result = await pollJob({
    repo,
    gen,
    jobId: gen.jobId,
    serverId: repo.kind === "cloud" ? gen.id : null,
    count: gen.creditsUsed || 4,
    onUpdate,
    signal,
  });
  if (signal.cancelled) return;
  if (result.ok) {
    await repo.addImages(gen.id, result.images);
    await repo.updateGeneration(gen.id, { status: "done", note: result.note });
  } else {
    if (repo.kind === "local") await repo.addCredits(gen.creditsUsed);
    await repo.updateGeneration(gen.id, { status: "failed", error: result.error });
    throw new JobError("FAILED");
  }
}

/** "Regenerate this one": a 1-credit job whose photo replaces the old one. */
export async function regenerateOne(args: {
  repo: Repo;
  config: PublicAppConfig;
  gen: Generation;
  imageId: string;
  onUpdate: (u: PollUpdate) => void;
}) {
  const { repo, config, gen, imageId, onUpdate } = args;
  const garment: GarmentChoice =
    gen.source.kind === "sample"
      ? { kind: "sample", sampleId: gen.source.sampleId, garmentType: gen.garmentType, preview: "" }
      : { kind: "upload", uploadId: gen.source.uploadId, garmentType: gen.garmentType, preview: "" };
  const slot = 4 + Math.floor(Math.random() * 40);
  const { jobId, serverId } = await requestJob({ repo, config, garment, look: gen.look, count: 1, variants: [slot] });
  const signal = { cancelled: false };
  const result = await pollJob({ repo, gen, jobId, serverId, count: 1, variants: [slot], onUpdate, signal });
  if (!result.ok || !result.images.length) {
    if (repo.kind === "local") await repo.addCredits(1);
    throw new JobError("FAILED");
  }
  await repo.addImages(gen.id, result.images);
  await repo.deleteImage(gen.id, imageId);
}
