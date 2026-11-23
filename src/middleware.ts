import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLES_COOKIE = "ds_roles";
const SELLER_ONLY = /^\/seller(\/|$)/;
const LOGIN_ONLY = /^\/(account\/.+|checkout|wishlist|notifications)(\/|$)/;

/**
 * Role-based routing:
 *  - /seller/*                         sellers only
 *  - /account/*, /checkout, /wishlist, /notifications   any logged-in user
 * Device (demo) accounts are recognised by the `ds_roles` cookie; Supabase
 * accounts by their session + profiles.role. Pages re-check on the client too.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const needsSeller = SELLER_ONLY.test(path);
  const needsLogin = needsSeller || LOGIN_ONLY.test(path);

  let res = NextResponse.next({ request: req });
  const deviceRoles = new Set((req.cookies.get(ROLES_COOKIE)?.value ?? "").split(".").filter(Boolean));
  let loggedIn = deviceRoles.size > 0;
  let isSeller = deviceRoles.has("seller");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const sb = createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getUser(); // also refreshes the session cookie
    if (data.user) {
      loggedIn = true;
      if (needsSeller && !isSeller) {
        const { data: p } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        isSeller = p?.role === "seller";
      }
    }
  }

  if (needsLogin && (!loggedIn || (needsSeller && !isSeller))) {
    const to = req.nextUrl.clone();
    to.pathname = loggedIn && needsSeller ? "/account" : "/login";
    to.search = loggedIn && needsSeller ? "?become=seller" : `?next=${encodeURIComponent(path)}${needsSeller ? "&role=seller" : ""}`;
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|samples|sw.js|manifest.webmanifest|favicon.ico|api).*)"],
};
