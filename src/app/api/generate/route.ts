import { NextResponse } from "next/server";
import { getProvider, mockProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { env } from "@/lib/server/env";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { parseDataUrlImage, parseGarmentType, parseLook } from "@/lib/server/validate";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";
import { SAMPLE_GARMENTS } from "@/lib/art/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (code: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: code, ...extra }, { status });

/**
 * Start a photo job.
 * Cloud accounts (Supabase): credits are deducted atomically in Postgres
 * (start_generation) BEFORE calling the AI, and refunded if the AI call fails.
 * Demo accounts keep credits on the device, so the server only runs the job.
 */
export async function POST(req: Request) {
  const { user, sb } = await currentUser();

  const rl = rateLimit(clientKey(req, user?.id), 8, 60_000);
  if (!rl.ok) return err("RATE_LIMIT", 429, { retryAfter: rl.retryAfter });

  const body = await req.json().catch(() => null);
  if (!body) return err("BAD_INPUT", 400);

  const garmentType = parseGarmentType(body.garmentType);
  const look = parseLook(body.look);
  const count = Number(body.count ?? 4);
  if (!garmentType || !look || !Number.isInteger(count) || count < 1 || count > 4) return err("BAD_INPUT", 400);

  const sampleId = typeof body.sampleId === "string" && SAMPLE_GARMENTS.some((s) => s.id === body.sampleId) ? body.sampleId : undefined;
  const variants = Array.isArray(body.variants) ? body.variants.filter((v: unknown) => Number.isInteger(v)).slice(0, 4) : undefined;

  // Paid AI only runs for signed-in cloud accounts, whose credits are charged in
  // Postgres below. Device and anonymous accounts keep their credits in the browser,
  // where anyone can edit them, so they always get the free demo provider.
  const cloud = !!(user && sb);
  const provider = cloud ? getProvider() : mockProvider;

  // The real AI needs the garment photo. Validate it server-side (type sniffing + 10 MB cap).
  let garmentImageUrl = "";
  if (!sampleId && cloud && env.provider === "real") {
    const img = parseDataUrlImage(body.garmentImage);
    if (!img.ok) return err(img.error === "size" ? "TOO_BIG" : "NOT_IMAGE", 400);
    garmentImageUrl = body.garmentImage;
  }

  // ---- credits (cloud accounts only)
  let generationId: string | null = null;
  if (user && sb) {
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : null;
    const { data, error } = await sb.rpc("start_generation", {
      p_amount: count,
      p_options: { garmentType, look, sampleId: sampleId ?? null, variants: variants ?? null },
      p_upload_id: uploadId,
    });
    if (error) {
      if (error.message.includes("INSUFFICIENT_CREDITS")) return err("NO_CREDITS", 402);
      console.error("[generate] start_generation", error.message);
      return err("SERVER", 500);
    }
    generationId = data as string;
  }

  try {
    const { jobId } = await provider.generate({
      garmentImageUrl,
      garmentType,
      model: { gender: look.gender, age: look.age, skin: look.skin, pose: look.pose },
      background: look.background,
      count,
      sampleId,
      variants,
    });
    if (generationId) await supabaseAdmin()?.rpc("finish_generation", { p_generation_id: generationId, p_ok: null, p_job_id: jobId });
    return NextResponse.json({ jobId, generationId });
  } catch (e) {
    if (generationId) {
      await supabaseAdmin()?.rpc("finish_generation", { p_generation_id: generationId, p_ok: false, p_error: (e as Error).message });
    }
    const code = e instanceof ProviderError ? e.code : "UNAVAILABLE";
    console.error("[generate] provider error", code, (e as Error).message);
    return err(code === "RATE_LIMIT" ? "RATE_LIMIT" : "AI_UNAVAILABLE", code === "RATE_LIMIT" ? 429 : 502, { refunded: !!generationId });
  }
}
