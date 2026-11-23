import { NextResponse } from "next/server";
import { sniffImageMime } from "@/lib/server/validate";

export const runtime = "nodejs";

// Only the AI provider's CDNs — this must never become an open proxy.
const ALLOWED_HOSTS = new Set(["cdn.fashn.ai", "media.fashn.ai"]);

/** Fetches a generated image from the AI CDN so the browser can save it (CORS-safe). */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const res = await fetch(target, { signal: AbortSignal.timeout(20_000), redirect: "error" }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: "UPSTREAM" }, { status: 502 });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > 15 * 1024 * 1024) return NextResponse.json({ error: "TOO_BIG" }, { status: 502 });
  const mime = sniffImageMime(buf);
  if (!mime) return NextResponse.json({ error: "NOT_IMAGE" }, { status: 502 });
  return new NextResponse(buf, { headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" } });
}
