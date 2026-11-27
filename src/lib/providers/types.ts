import { createHmac, timingSafeEqual } from "node:crypto";
import { appSecret } from "../server/env";
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

/*
 * Job tokens are self-describing so status polling works on stateless serverless
 * functions. They are signed with APP_SECRET, so a browser can't invent one: it can't
 * point a poll at somebody else's AI job, or mint a demo job that is already "done".
 */
const tokenMac = (body: string) => createHmac("sha256", appSecret()).update(body).digest("base64url").slice(0, 22);

export const encodeToken = (o: unknown) => {
  const body = Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${body}.${tokenMac(body)}`;
};

export function decodeToken<T>(s: string): T | null {
  const dot = s.lastIndexOf(".");
  if (dot < 1) return null;
  const body = s.slice(0, dot);
  const given = Buffer.from(s.slice(dot + 1));
  const expected = Buffer.from(tokenMac(body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
