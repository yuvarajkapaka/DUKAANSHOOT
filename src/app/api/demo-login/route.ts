import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Cloud deployments: "Demo as Seller / Buyer" signs into shared demo accounts
 * (created by scripts/seed-supabase.mjs). Passwords stay on the server.
 * Without these env vars the browser falls back to on-device demo accounts.
 */
export async function POST(req: Request) {
  if (!rateLimit(clientKey(req) + ":demo", 10, 60_000).ok) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const role = body?.role === "seller" ? "SELLER" : "BUYER";
  const email = process.env[`DEMO_${role}_EMAIL`];
  const password = process.env[`DEMO_${role}_PASSWORD`];
  const sb = await supabaseServer();
  if (!sb || !email || !password) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 404 });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: "FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
