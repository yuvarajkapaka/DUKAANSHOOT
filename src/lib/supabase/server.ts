import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, supabaseEnabled } from "../server/env";

/** Supabase client acting as the logged-in user (RLS applies). Null when Supabase is not configured. */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!supabaseEnabled) return null;
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component — middleware refreshes the session instead
        }
      },
    },
  });
}

/** Service-role client: bypasses RLS. Server only, used for credits/payments/refunds. */
export function supabaseAdmin(): SupabaseClient | null {
  if (!supabaseEnabled || !env.supabaseService) return null;
  return createClient(env.supabaseUrl, env.supabaseService, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Returns the Supabase user for this request, or null (demo / logged out / not configured). */
export async function currentUser() {
  const sb = await supabaseServer();
  if (!sb) return { sb: null, user: null };
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user ?? null };
}
