import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Product view / WhatsApp-click counters (cloud marketplace). They feed the seller's
 * dashboard, so they go through here instead of straight to the database: a visitor
 * counts once per product and counter every 30 minutes, and can't loop a number up.
 * (The database function is service-role only, see migration 0003.)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const productId = typeof body?.productId === "string" && UUID.test(body.productId) ? body.productId : null;
  const field = body?.field === "views" || body?.field === "wa" ? (body.field as "views" | "wa") : null;
  if (!productId || !field) return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });

  const who = clientKey(req);
  if (!rateLimit(`${who}:track`, 60, 60_000).ok) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  if (!rateLimit(`${who}:track:${field}:${productId}`, 1, 30 * 60_000).ok) return NextResponse.json({ ok: true, counted: false });

  await supabaseAdmin()?.rpc("track_product", { p_id: productId, p_field: field });
  return NextResponse.json({ ok: true, counted: true });
}
