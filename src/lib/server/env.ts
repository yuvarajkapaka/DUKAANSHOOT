import "server-only";
import { loadPacks } from "../packs";
import type { PublicAppConfig } from "../types";

const has = (v?: string) => typeof v === "string" && v.trim().length > 0;

const supabaseConfigured = has(process.env.NEXT_PUBLIC_SUPABASE_URL) && has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Demo mode fails closed. It is on by default only while there are no real accounts
 * (no Supabase). Once Supabase is configured it has to be asked for with DEMO_MODE=true,
 * so a forgotten variable can't hand every real account free simulated top-ups.
 */
const demoMode = has(process.env.DEMO_MODE) ? process.env.DEMO_MODE !== "false" : !supabaseConfigured;

const DEV_ONLY_SECRET = "dev-only-insecure-secret-change-me";

export const env = {
  demoMode,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  provider: (process.env.TRYON_PROVIDER === "real" && has(process.env.FASHN_API_KEY) ? "real" : "mock") as "real" | "mock",
  fashnKey: process.env.FASHN_API_KEY ?? "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  appSecret: process.env.APP_SECRET ?? "",
};

export const supabaseEnabled = supabaseConfigured;

/**
 * HMAC key for simulated payment orders and AI job tokens. Development falls back to
 * a fixed string; a production deployment without APP_SECRET refuses to sign rather
 * than use a key anyone can read in this file.
 */
export function appSecret(): string {
  if (has(env.appSecret)) return env.appSecret;
  if (process.env.NODE_ENV !== "production") return DEV_ONLY_SECRET;
  throw new Error("APP_SECRET is not set: add it to this deployment's environment variables");
}

/**
 * Test-mode money (the simulated checkout, or rzp_test_ Razorpay keys) must never buy
 * paid AI for a real account. True when such a top-up has to be refused.
 */
export function testMoneyBlocked(cloudUser: boolean, testMode: boolean) {
  return cloudUser && testMode && env.provider === "real";
}

/** Razorpay is used only with TEST keys while DEMO_MODE is on — never takes real money in a demo. */
export const razorpayEnabled =
  has(env.razorpayKeyId) && has(env.razorpaySecret) && (!env.demoMode || env.razorpayKeyId.startsWith("rzp_test_"));

export function publicConfig(): PublicAppConfig {
  return {
    provider: env.provider,
    supabase: supabaseEnabled,
    payments: razorpayEnabled ? "razorpay-test" : "simulated",
    razorpayKeyId: razorpayEnabled ? env.razorpayKeyId : null,
    packs: loadPacks(),
    demoMode: env.demoMode,
  };
}
