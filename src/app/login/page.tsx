"use client";
import { ArrowRight, Eye, Mail, PlayCircle, ShoppingBag, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAppConfig, useSession } from "@/components/providers";
import { AuthFrame } from "@/components/brand/auth-frame";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { Role } from "@/lib/market/types";
import { cn } from "@/lib/utils";

const getSupabase = async () => (await import("@/lib/supabase/browser")).supabaseBrowser();

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-6">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function LoginInner() {
  const t = useTranslations("login");
  const tr = useTranslations("roles");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const config = useAppConfig();
  const { status, profile, startDemo, createDeviceAccount } = useSession();
  const [role, setRole] = useState<Role>((params.get("role") as Role) || "buyer");
  const [busy, setBusy] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const next = params.get("next");

  const home = (r: Role | null) => (next && (r === "seller" || !next.startsWith("/seller")) ? next : r === "seller" ? "/seller" : "/market");

  useEffect(() => {
    if (status === "ready" && profile && !busy && profile.role && (!next?.startsWith("/seller") || profile.role === "seller")) router.replace(home(profile.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    if (params.get("error")) toast.error(t("badEmail"));
  }, [params, t]);

  const demo = async (r: Role) => {
    setBusy(`demo-${r}`);
    try {
      const p = await startDemo(r, locale);
      router.replace(home(p.role));
    } catch {
      setBusy(null);
    }
  };

  const onPhone = async () => {
    setBusy("phone");
    await createDeviceAccount(role, locale);
    router.replace(`/onboarding?next=${encodeURIComponent(home(role))}`);
  };

  const google = async () => {
    const sb = await getSupabase();
    if (!sb) return;
    setBusy("google");
    localStorage.setItem("ds_pending_role", role);
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  };

  const sendLink = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error(t("badEmail"));
    const sb = await getSupabase();
    if (!sb) return;
    setBusy("email");
    localStorage.setItem("ds_pending_role", role);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(null);
    if (error) toast.error(error.message);
    else setSent(true);
  };

  return (
    <AuthFrame>

  <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-3 pb-6">
      <div className="flex items-center justify-between">
        <Link href="/market" className="flex items-center" aria-label="DukaanShoot">
          <LogoMark size={40} />
        </Link>
        <LanguageSwitcher />
      </div>

      <h1 className="anim-rise mt-6 font-display text-[1.8rem] leading-tight font-semibold md:text-[2.1rem]">{tr("title")}</h1>

      {/* "I want to SELL 🏪" / "I want to BUY 🛍️" */}
      <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label={tr("title")}>
        {(
          [
            ["seller", Store, tr("sell"), tr("sellHint")],
            ["buyer", ShoppingBag, tr("buy"), tr("buyHint")],
          ] as const
        ).map(([r, Icon, title, hint], i) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            style={{ animationDelay: `${80 + i * 80}ms` }}
            data-side={r}
            className={cn(
              "anim-rise card-lux flex min-h-44 flex-col items-start gap-2 p-5 text-left transition-[transform,box-shadow] hover:-translate-y-1 active:scale-[0.97]",
              role === r && "ring-2 ring-gold ring-offset-2 ring-offset-cream",
            )}
          >
            <span className="panel-night flex size-12 items-center justify-center rounded-2xl shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_40%,transparent),0_8px_18px_-10px_rgb(21_18_46/0.6)]" aria-hidden>
              <Icon className="size-6 text-gold-light" />
            </span>
            <span className="font-display text-[1.15rem] leading-tight font-semibold">{title}</span>
            <span className="text-sm text-ink-soft">{hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto grid gap-3 pt-6">
        {config.supabase ? (
          <>
            <Button variant="outline" size="lg" block onClick={google} loading={busy === "google"}>
              <GoogleIcon />
              {t("google")}
            </Button>
            <Button variant="outline" size="lg" block onClick={() => setEmailOpen(true)}>
              <Mail aria-hidden />
              {t("email")}
            </Button>
          </>
        ) : (
          <div data-side={role}>
            <Button size="lg" block onClick={onPhone} loading={busy === "phone"}>
              {tr("startPhone")}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        )}

        <div className="my-1 flex items-center gap-3 text-sm text-ink-soft" aria-hidden>
          <span className="rule-gold flex-1" />
          {tr("or")}
          <span className="rule-gold flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="marigold" size="lg" onClick={() => demo("seller")} loading={busy === "demo-seller"} className="px-3 text-[15px]">
            <PlayCircle aria-hidden />
            {tr("demoSeller")}
          </Button>
          <div data-side="buyer" className="grid">
            <Button size="lg" onClick={() => demo("buyer")} loading={busy === "demo-buyer"} className="px-3 text-[15px]">
              <PlayCircle aria-hidden />
              {tr("demoBuyer")}
            </Button>
          </div>
        </div>
        <p className="-mt-1 text-center text-sm text-ink-soft">{tr("demoHint")}</p>
        <Button asChild variant="ghost">
          <Link href="/market">
            <Eye aria-hidden />
            {tr("browse")}
          </Link>
        </Button>
      </div>

      <Sheet open={emailOpen} onOpenChange={setEmailOpen} title={t("email")}>
        {sent ? (
          <p className="rounded-2xl bg-green-50 p-4 pb-6 text-lg text-leaf dark:bg-green-950/40">{t("linkSent")}</p>
        ) : (
          <form
            className="grid gap-4 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              void sendLink();
            }}
          >
            <label className="grid gap-2 font-semibold">
              {t("emailLabel")}
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="min-h-14 rounded-2xl border-2 border-line bg-paper px-4 text-lg outline-none focus:border-accent"
              />
            </label>
            <Button type="submit" size="lg" block loading={busy === "email"}>
              <Mail aria-hidden />
              {t("sendLink")}
            </Button>
          </form>
        )}
      </Sheet>
    </main>
    </AuthFrame>
  );
}

export default function Login() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
