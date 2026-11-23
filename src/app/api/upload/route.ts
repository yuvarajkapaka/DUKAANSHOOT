import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES, sniffImageMime } from "@/lib/server/validate";
import { parseGarmentType } from "@/lib/server/validate";
import { currentUser } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Cloud accounts: store the garment photo in the private `uploads` bucket.
 * Validates server-side: images only (magic bytes, not the file name), max 10 MB.
 */
export async function POST(req: Request) {
  const { user, sb } = await currentUser();
  if (!user || !sb) return NextResponse.json({ error: "AUTH" }, { status: 401 });
  if (!rateLimit(clientKey(req, user.id) + ":upload", 20, 60_000).ok) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const garmentType = parseGarmentType(form?.get("garmentType")) ?? "other";
  if (!(file instanceof Blob)) return NextResponse.json({ error: "NOT_IMAGE" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "TOO_BIG" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) return NextResponse.json({ error: "NOT_IMAGE" }, { status: 415 });

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from("uploads").upload(path, bytes, { contentType: mime, upsert: false });
  if (up.error) return NextResponse.json({ error: "SERVER" }, { status: 500 });

  const { data, error } = await sb.from("uploads").insert({ user_id: user.id, image_path: path, garment_type: garmentType }).select("id").single();
  if (error) return NextResponse.json({ error: "SERVER" }, { status: 500 });
  return NextResponse.json({ uploadId: data.id, path });
}
