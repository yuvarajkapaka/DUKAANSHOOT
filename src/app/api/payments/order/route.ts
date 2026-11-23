import { NextResponse } from "next/server";
import { loadPacks } from "@/lib/packs";
import { env, razorpayEnabled } from "@/lib/server/env";
import { createOrder, simulatedOrder } from "@/lib/server/razorpay";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Create a payment order for a credit pack. Prices always come from the server, never the browser. */
export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!rateLimit(clientKey(req, user?.id) + ":order", 10, 60_000).ok) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const pack = loadPacks().find((p) => p.id === body?.packId);
  if (!pack) return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });

  if (!razorpayEnabled) {
    if (!env.demoMode) return NextResponse.json({ error: "PAYMENTS_DISABLED" }, { status: 503 });
    const orderId = simulatedOrder(pack.id);
    if (user) {
      await supabaseAdmin()?.from("payments").insert({
        user_id: user.id,
        razorpay_order_id: orderId,
        amount_paise: pack.pricePaise,
        credits_added: pack.credits,
        status: "created",
      });
    }
    return NextResponse.json({ mode: "simulated", orderId, amount: pack.pricePaise, credits: pack.credits });
  }

  try {
    const order = await createOrder(pack.pricePaise, `ds_${Date.now()}`, { packId: pack.id, userId: user?.id ?? "demo" });
    if (user) {
      const { error } = await supabaseAdmin()!.from("payments").insert({
        user_id: user.id,
        razorpay_order_id: order.id,
        amount_paise: pack.pricePaise,
        credits_added: pack.credits,
        status: "created",
      });
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({
      mode: "razorpay",
      orderId: order.id,
      amount: pack.pricePaise,
      currency: "INR",
      keyId: env.razorpayKeyId,
      credits: pack.credits,
    });
  } catch (e) {
    console.error("[payments/order]", (e as Error).message);
    return NextResponse.json({ error: "SERVER" }, { status: 502 });
  }
}
