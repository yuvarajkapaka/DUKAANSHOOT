import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Razorpay webhook (Dashboard → Webhooks → events: payment.captured, order.paid).
 * Backup path in case the shopkeeper closes the app before /verify runs.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ error: "BAD_SIGNATURE" }, { status: 400 });

  const evt = JSON.parse(raw);
  const payment = evt?.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id ?? evt?.payload?.order?.entity?.id;
  if ((evt.event === "payment.captured" || evt.event === "order.paid") && orderId) {
    const admin = supabaseAdmin();
    if (admin) {
      const { error } = await admin.rpc("mark_payment_paid", { p_order_id: orderId, p_payment_id: payment?.id ?? "webhook" });
      if (error && !error.message.includes("ORDER_NOT_FOUND")) return NextResponse.json({ error: "SERVER" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
