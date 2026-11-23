import "server-only";
import { decodeToken, encodeToken, ProviderError, type TryOnInput, type TryOnProvider, type TryOnStatus } from "./types";

/**
 * FASHN "product-to-model" integration (checked against docs.fashn.ai, Nov 2026):
 *   POST https://api.fashn.ai/v1/run  { model_name: "product-to-model", inputs: {...} } -> { id, error }
 *   GET  https://api.fashn.ai/v1/status/{id}  -> { id, status, output: string[], error }
 *   status: starting | in_queue | processing | completed | failed
 *   API errors: 429 OutOfCredits / RateLimitExceeded / ConcurrencyLimitExceeded, 401 UnauthorizedAccess
 * product_image accepts an https URL or a base64 data URI. num_images is 1..4.
 * Output URLs expire after 72h, so the app copies results into its own storage.
 * NOTE: product-to-model is marked "Preview" by FASHN — re-check the docs before production.
 */
const BASE = "https://api.fashn.ai/v1";

const BACKGROUND_PROMPTS: Record<TryOnInput["background"], string> = {
  white: "plain seamless pure white studio background, e-commerce catalogue photo, soft even lighting",
  studio: "light grey photo studio backdrop, soft box lighting, professional fashion photo",
  wedding: "decorated Indian wedding mandap with marigold garlands and warm golden lights",
  street: "colourful Indian city street in daylight, shallow depth of field",
  festive: "Diwali festive night with diyas and warm string lights, bokeh",
  shop: "inside a traditional Indian clothing shop with shelves of folded fabric",
};

const POSE_PROMPTS: Record<TryOnInput["model"]["pose"], string> = {
  standing: "standing straight facing the camera, full body",
  side: "three-quarter side pose, full body",
  hip: "one hand on hip, confident pose, full body",
  closeup: "upper body close-up",
};

export function modelPrompt(i: TryOnInput) {
  const m = i.model;
  const who = { woman: "Indian woman", man: "Indian man", girl: "Indian girl about 8 years old", boy: "Indian boy about 8 years old" }[m.gender];
  const adult = m.gender === "woman" || m.gender === "man";
  const age = adult ? { young: "in their early twenties", adult: "about 35 years old", senior: "about 60 years old" }[m.age] : "";
  const skin = { light: "fair skin", wheatish: "wheatish skin", medium: "medium brown skin", dusky: "dark brown skin" }[m.skin];
  const wear = i.garmentType === "saree" ? "wearing this saree draped in traditional Nivi style" : `wearing this ${i.garmentType}`;
  return `${who} ${age}, ${skin}, ${wear}, ${POSE_PROMPTS[m.pose]}, ${BACKGROUND_PROMPTS[i.background]}. Keep the exact colour, print and border of the garment.`
    .replace(/\s+/g, " ")
    .trim();
}

interface FashnJob {
  id: string;
  t: number;
}

export class FashnProvider implements TryOnProvider {
  readonly name = "fashn";
  private readonly apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  private static mapError(status: number, body: { error?: unknown; message?: string }) {
    const name = typeof body?.error === "string" ? body.error : "";
    if (name === "OutOfCredits") return new ProviderError("AI credits finished", "OUT_OF_CREDITS");
    if (status === 429) return new ProviderError(body?.message || "Rate limited", "RATE_LIMIT");
    if (status === 401) return new ProviderError("Invalid AI API key", "AUTH");
    if (status === 400) return new ProviderError(body?.message || "Bad input", "BAD_INPUT");
    return new ProviderError(body?.message || `AI service error ${status}`, "UNAVAILABLE");
  }

  async generate(input: TryOnInput) {
    const res = await fetch(`${BASE}/run`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model_name: "product-to-model",
        inputs: {
          product_image: input.garmentImageUrl,
          prompt: modelPrompt(input),
          aspect_ratio: "4:5",
          num_images: Math.max(1, Math.min(4, input.count || 4)),
          output_format: "jpeg",
          resolution: "1k",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.id) throw FashnProvider.mapError(res.status, body);
    const job: FashnJob = { id: String(body.id), t: Date.now() };
    return { jobId: `fashn.${encodeToken(job)}` };
  }

  async getStatus(jobId: string): Promise<TryOnStatus> {
    const job = decodeToken<FashnJob>(jobId.replace(/^fashn\./, ""));
    if (!job?.id) return { status: "failed", error: "Unknown job" };
    const res = await fetch(`${BASE}/status/${encodeURIComponent(job.id)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw FashnProvider.mapError(res.status, body);
    // FASHN reports no percentage, so estimate from elapsed time (~20 s typical)
    const est = Math.min(95, Math.round(((Date.now() - job.t) / 20_000) * 100));
    switch (body.status) {
      case "completed":
        return { status: "done", progress: 100, imageUrls: (body.output ?? []) as string[] };
      case "failed":
        return { status: "failed", error: body.error?.message || body.error?.name || "AI failed" };
      case "processing":
        return { status: "running", progress: est };
      default:
        return { status: "queued", progress: Math.min(est, 20) };
    }
  }
}
