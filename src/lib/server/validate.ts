import "server-only";
import { AGE_GROUPS, BACKGROUNDS, GARMENT_TYPES, GENDERS, POSES, SKIN_TONES, type LookOptions, type GarmentType } from "../types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/** Detect the real image type from magic bytes — never trust the file name or the browser's MIME. */
export function sniffImageMime(buf: Uint8Array): (typeof ALLOWED_MIME)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

/** Validates a data: URI image. Returns the decoded bytes + mime, or an error code. */
export function parseDataUrlImage(dataUrl: unknown): { ok: true; mime: string; bytes: Buffer } | { ok: false; error: "type" | "size" } {
  if (typeof dataUrl !== "string") return { ok: false, error: "type" };
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { ok: false, error: "type" };
  if ((m[2].length * 3) / 4 > MAX_UPLOAD_BYTES) return { ok: false, error: "size" };
  const bytes = Buffer.from(m[2], "base64");
  const real = sniffImageMime(bytes);
  if (!real) return { ok: false, error: "type" };
  return { ok: true, mime: real, bytes };
}

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

export function parseLook(v: unknown): LookOptions | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!oneOf(GENDERS, o.gender) || !oneOf(AGE_GROUPS, o.age) || !oneOf(SKIN_TONES, o.skin) || !oneOf(POSES, o.pose) || !oneOf(BACKGROUNDS, o.background))
    return null;
  return { gender: o.gender, age: o.age, skin: o.skin, pose: o.pose, background: o.background };
}

export function parseGarmentType(v: unknown): GarmentType | null {
  return oneOf(GARMENT_TYPES, v) ? v : null;
}
