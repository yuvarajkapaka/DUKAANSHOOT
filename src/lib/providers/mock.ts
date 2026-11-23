import { SAMPLE_GARMENTS, SAMPLE_RESULT_COUNT, sampleResultUrl } from "../art/samples";
import { encodeRenderUrl } from "../render-url";
import { decodeToken, encodeToken, type TryOnInput, type TryOnProvider, type TryOnStatus } from "./types";

interface MockJob {
  t: number; // start time
  d: number; // duration ms
  s?: string; // sample id
  g: TryOnInput["garmentType"];
  m: TryOnInput["model"];
  b: TryOnInput["background"];
  v: number[]; // variant slots
  n?: "fallback";
}

/**
 * Free provider for demos. No network calls and no state: the job token itself
 * carries the start time, so any serverless instance can answer a status poll.
 *  - sample garments -> pre-made photos in /public/samples/results
 *  - uploaded photos -> "render:" URLs; the browser composites the shopkeeper's
 *                       own garment photo onto an illustrated model
 */
export class MockProvider implements TryOnProvider {
  readonly name = "mock";
  private readonly minMs: number;
  private readonly maxMs: number;

  constructor(opts: { minMs?: number; maxMs?: number } = {}) {
    this.minMs = opts.minMs ?? 5000;
    this.maxMs = opts.maxMs ?? 8000;
  }

  async generate(input: TryOnInput, note?: "fallback") {
    const count = Math.max(1, Math.min(4, input.count || 4));
    const variants = input.variants?.length
      ? input.variants.slice(0, 4).map((v) => Math.abs(Math.trunc(v)) % 64)
      : Array.from({ length: count }, (_, i) => i);
    const job: MockJob = {
      t: Date.now(),
      d: Math.round(this.minMs + Math.random() * (this.maxMs - this.minMs)),
      s: input.sampleId && SAMPLE_GARMENTS.some((x) => x.id === input.sampleId) ? input.sampleId : undefined,
      g: input.garmentType,
      m: input.model,
      b: input.background,
      v: variants,
      n: note,
    };
    return { jobId: `mock.${encodeToken(job)}` };
  }

  async getStatus(jobId: string): Promise<TryOnStatus> {
    const job = decodeToken<MockJob>(jobId.replace(/^mock\./, ""));
    if (!job || typeof job.t !== "number" || !Array.isArray(job.v)) return { status: "failed", error: "Unknown job" };
    const elapsed = Date.now() - job.t;
    if (elapsed < job.d) {
      const x = elapsed / job.d; // ease-out so it feels quick at the start
      const progress = Math.min(97, Math.round((1 - Math.pow(1 - x, 2)) * 100));
      return { status: elapsed < 600 ? "queued" : "running", progress };
    }
    const imageUrls = job.v.map((slot) =>
      job.s
        ? sampleResultUrl(job.s, slot % SAMPLE_RESULT_COUNT)
        : encodeRenderUrl({ garment: job.g, ...job.m, background: job.b, variant: slot }),
    );
    return { status: "done", progress: 100, imageUrls, note: job.s ? "sample" : job.n };
  }
}
