import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const API = "https://api.razorpay.com/v1";
const auth = () => "Basic " + Buffer.from(`${env.razorpayKeyId}:${env.razorpaySecret}`).toString("base64");

export function hmacHex(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) throw new Error(body?.error?.description || "Razorpay order failed");
  return body as { id: string; amount: number; currency: string; notes: Record<string, string> };
}

export async function fetchOrder(orderId: string) {
  const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: auth() },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error("Razorpay order lookup failed");
  return (await res.json()) as { id: string; amount: number; status: string; notes: Record<string, string> };
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret) */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  return safeEqualHex(hmacHex(env.razorpaySecret, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret) */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.razorpayWebhookSecret) return false;
  return safeEqualHex(hmacHex(env.razorpayWebhookSecret, rawBody), signature);
}

/* ---- simulated payments (no Razorpay keys): orders are signed by our own secret ---- */
export function simulatedOrder(packId: string) {
  const nonce = randomBytes(6).toString("hex");
  const base = `sim_${packId}_${nonce}`;
  return `${base}_${hmacHex(env.appSecret, base).slice(0, 16)}`;
}

export function parseSimulatedOrder(orderId: string): string | null {
  const m = /^(sim_([a-z0-9]+)_[a-f0-9]{12})_([a-f0-9]{16})$/.exec(orderId);
  if (!m) return null;
  return safeEqualHex(hmacHex(env.appSecret, m[1]).slice(0, 16), m[3]) ? m[2] : null;
}
