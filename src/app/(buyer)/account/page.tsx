"use client";
import { ChevronRight, LogIn, LogOut, MapPin, Moon, RotateCcw, Save, Store, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useChangeLocale } from "@/components/language-switcher";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { LocalRepo } from "@/lib/client/local-repo";
import { useTheme } from "@/lib/client/theme";
import type { Address } from "@/lib/market/types";

const input = "min-h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-lg outline-none focus:border-accent";

function AccountInner() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const { change } = useChangeLocale();
  const theme = useTheme();
  const { status, profile, repo, market, setProfile, signOut, setRole } = useSession();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setCity(profile.city ?? "");
    setPhone(profile.phone ?? "");
    void market.listAddresses(profile.id).then(setAddresses);
  }, [profile, market]);

  useEffect(() => {
    if (params.get("become") === "seller") toast(t("becomeSeller"));
  }, [params, t]);

  if (status === "loading") return <div className="skeleton mx-4 mt-4 h-40 rounded-[var(--radius-card)]" />;

  const settingsCard = (
    <>
      <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
        <h2 className="mb-3 text-lg">{tc("language")}</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tc("language")}>
          {LOCALES.map((l) => (
            <Chip key={l} selected={l === locale} onClick={() => change(l)} className="justify-center px-2">
              {LOCALE_LABELS[l].native}
            </Chip>
          ))}
        </div>
        <h2 className="mt-5 mb-3 text-lg">{t("appearance")}</h2>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("appearance")}>
          <Chip selected={!theme.dark} onClick={() => theme.set(false)} className="justify-center">
            <Sun className="size-5" aria-hidden />
            {t("light")}
          </Chip>
          <Chip selected={theme.dark} onClick={() => theme.set(true)} className="justify-center">
            <Moon className="size-5" aria-hidden />
            {t("dark")}
          </Chip>
        </div>
      </section>
    </>
  );

  if (!profile || !repo) {
    return (
      <>
        <AppHeader title={t("title")} width="3xl" />
        <main className="mx-auto max-w-3xl px-4">
          <EmptyState
            title={t("guestTitle")}
            body={t("guestBody")}
            action={
              <Button asChild size="lg">
                <Link href="/login?next=/account">
                  <LogIn aria-hidden />
                  {t("login")}
                </Link>
              </Button>
            }
          />
          {settingsCard}
        </main>
      </>
    );
  }

  const save = async () => {
    setProfile(await repo.updateProfile({ name: name.trim(), city: city.trim(), phone: phone.trim() }));
    toast.success(t("saved"));
  };

  const startSelling = async () => {
    if (profile.role !== "seller") await setRole("seller");
    router.push(profile.shopName ? "/seller" : "/onboarding?next=/seller");
  };

  return (
    <>
      <AppHeader title={t("title")} width="3xl" />
      <main className="mx-auto max-w-3xl px-4">
        <section className="flex items-center gap-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <span className="flex size-16 items-center justify-center rounded-full bg-accent font-display text-2xl font-bold text-on-accent">{(profile.name || profile.shopName || "?").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate font-display text-xl">{profile.name || profile.shopName}</p>
            <p className="truncate text-ink-soft">{profile.email ?? profile.phone}</p>
          </div>
        </section>

        <button
          type="button"
          onClick={startSelling}
          className="mt-4 flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-gradient-to-r from-saffron-500 to-saffron-400 p-4 text-left text-night shadow-warm transition-transform active:scale-[0.98]"
        >
          <Store className="size-8 shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="block font-display text-lg font-bold">{profile.role === "seller" ? t("sellerDashboard") : t("startSelling")}</span>
            {profile.role !== "seller" ? <span className="text-[15px]">{t("startSellingHint")}</span> : null}
          </span>
          <ChevronRight className="size-6" aria-hidden />
        </button>

        <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <div className="grid gap-3">
            <label className="grid gap-1 font-semibold">
              {t("name")}
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 font-semibold">
                {t("city")}
                <input className={input} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
              </label>
              <label className="grid gap-1 font-semibold">
                {t("phone")}
                <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
              </label>
            </div>
            <Button onClick={save}>
              <Save aria-hidden />
              {t("save")}
            </Button>
          </div>
        </section>

        <section className="mt-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <h2 className="mb-2 text-lg">{t("addresses")}</h2>
          {addresses.length ? (
            <ul className="grid gap-2">
              {addresses.map((a) => (
                <li key={a.id} className="flex gap-2 rounded-2xl bg-saffron-50 p-3">
                  <MapPin className="size-5 shrink-0 text-accent-strong" aria-hidden />
                  <span>
                    <b>{a.name}</b> · {a.line1}, {a.city} – {a.pincode}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">{t("noAddresses")}</p>
          )}
        </section>

        {settingsCard}

        <div className="mt-4 grid gap-3 pb-6">
          <Button variant="outline" size="lg" block onClick={signOut}>
            <LogOut aria-hidden />
            {t("logout")}
          </Button>
          {repo.kind === "local" ? (
            <Button
              variant="ghost"
              onClick={async () => {
                await LocalRepo.resetDevice();
                toast.success(t("resetDone"));
                await signOut();
                location.href = "/market";
              }}
            >
              <RotateCcw aria-hidden />
              {t("resetDemo")}
            </Button>
          ) : null}
        </div>
      </main>
    </>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountInner />
    </Suspense>
  );
}
