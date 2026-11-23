import { NextResponse } from "next/server";
import { loadPacks } from "@/lib/packs";
import { env, razorpayEnabled } from "@/lib/server/env";
import { fetchOrder, parseSimulatedOrder, verifyCheckoutSignature } from "@/lib/server/razorpay";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Verify a payment SERVER-SIDE before any credits are added.
 * - Razorpay: checks the HMAC signature, then reads the order from Razorpay to
 *   learn the amount/pack (never trusts the browser).
 * - Cloud accounts: credits are added in Postgres exactly once (mark_payment_paid),
 *   so the webhook and this route can both fire safely.
 * - Demo accounts: returns the verified number of credits for the device wallet.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  const signature = typeof body?.signature === "string" ? body.signature : "";
  const { user } = await currentUser();
  const admin = supabaseAdmin();

  let credits = 0;

  const simPack = parseSimulatedOrder(orderId);
  if (simPack) {
    if (!env.demoMode) return NextResponse.json({ ok: false, error: "PAYMENTS_DISABLED" }, { status: 400 });
    if (body?.simulateFailure) {
      if (user) await admin?.from("payments").update({ status: "failed" }).eq("razorpay_order_id", orderId).eq("user_id", user.id);
      return NextResponse.json({ ok: false, error: "FAILED" }, { status: 402 });
    }
    credits = loadPacks().find((p) => p.id === simPack)?.credits ?? 0;
  } else {
    if (!razorpayEnabled || !orderId || !paymentId || !signature) return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 });
    if (!verifyCheckoutSignature(orderId, paymentId, signature)) return NextResponse.json({ ok: false, error: "BAD_SIGNATURE" }, { status: 400 });
    const order = await fetchOrder(orderId).catch(() => null);
    if (!order) return NextResponse.json({ ok: false, error: "RETRY" }, { status: 502 });
    const pack = loadPacks().find((p) => p.id === order.notes?.packId && p.pricePaise === order.amount);
    credits = pack?.credits ?? 0;
  }
  if (!credits) return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 });

  if (user) {
    if (!admin) return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
    const { data: row } = await admin.from("payments").select("user_id").eq("razorpay_order_id", orderId).maybeSingle();
    if (!row || row.user_id !== user.id) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    const { data, error } = await admin.rpc("mark_payment_paid", { p_order_id: orderId, p_payment_id: paymentId || "simulated" });
    if (error) return NextResponse.json({ ok: false, error: "SERVER" }, { status: 500 });
    return NextResponse.json({ ok: true, credits, added: data as number, wallet: "cloud" });
  }

  return NextResponse.json({ ok: true, credits, added: credits, wallet: "device" });
}
