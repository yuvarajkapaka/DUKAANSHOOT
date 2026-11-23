import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Google OAuth / email magic-link land here; exchange the code, then onboarding picks the role. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const sb = await supabaseServer();
  if (code && sb) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: p } = await sb.from("profiles").select("role, shop_name, name").eq("id", data.user.id).maybeSingle();
      const done = p?.role && (p.role === "seller" ? p.shop_name : p.name);
      return NextResponse.redirect(new URL(done ? (p!.role === "seller" ? "/seller" : "/market") : "/onboarding", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
