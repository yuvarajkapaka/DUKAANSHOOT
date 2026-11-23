import "server-only";
import { loadPacks } from "../packs";
import type { PublicAppConfig } from "../types";

const has = (v?: string) => typeof v === "string" && v.trim().length > 0;

export const env = {
  demoMode: process.env.DEMO_MODE !== "false",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  provider: (process.env.TRYON_PROVIDER === "real" && has(process.env.FASHN_API_KEY) ? "real" : "mock") as "real" | "mock",
  fashnKey: process.env.FASHN_API_KEY ?? "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  appSecret: process.env.APP_SECRET || "dev-only-insecure-secret-change-me",
};

export const supabaseEnabled = has(env.supabaseUrl) && has(env.supabaseAnon);

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
