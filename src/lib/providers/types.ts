import type { GarmentType, LookOptions } from "../types";

export interface TryOnInput {
  /** https URL or data: URI of the garment photo */
  garmentImageUrl: string;
  garmentType: GarmentType;
  model: Pick<LookOptions, "gender" | "age" | "skin" | "pose">;
  background: LookOptions["background"];
  /** default 4 */
  count: number;
  /** demo sample garments have pre-made results */
  sampleId?: string;
  /** which result slots to produce (used by "Regenerate this one") */
  variants?: number[];
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface TryOnStatus {
  status: JobStatus;
  progress?: number;
  imageUrls?: string[];
  error?: string;
  /** "sample" = pre-made demo photos, "fallback" = real AI failed and we used demo photos */
  note?: "sample" | "fallback";
}

export interface TryOnProvider {
  readonly name: string;
  generate(input: TryOnInput): Promise<{ jobId: string }>;
  getStatus(jobId: string): Promise<TryOnStatus>;
}

export type ProviderErrorCode = "OUT_OF_CREDITS" | "RATE_LIMIT" | "BAD_INPUT" | "AUTH" | "UNAVAILABLE";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  constructor(message: string, code: ProviderErrorCode) {
    super(message);
    this.code = code;
  }
}

/* Job tokens are self-describing so status polling works on stateless serverless functions. */
export const encodeToken = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
export function decodeToken<T>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
