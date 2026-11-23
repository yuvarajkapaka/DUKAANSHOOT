"use client";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/providers";
import { SHOP_ICONS } from "@/components/shop-icons";
import { AuthFrame } from "@/components/brand/auth-frame";
import { Button } from "@/components/ui/button";
import { addDeviceRole } from "@/lib/client/device-session";
import type { Role } from "@/lib/market/types";
import { SHOP_TYPES, type ShopType } from "@/lib/types";
import { cn } from "@/lib/utils";

const input = "min-h-14 rounded-2xl border-2 border-line bg-paper px-4 text-lg font-normal outline-none focus:border-accent";

/** Role pick (if missing) → sellers: shop details · buyers: name + city. */
function OnboardingInner() {
  const t = useTranslations("onboarding");
  const tb = useTranslations("onboard");
  const tr = useTranslations("roles");
  const ts = useTranslations("shopTypes");
  const router = useRouter();
  const params = useSearchParams();
  const { status, repo, profile, setProfile, market } = useSession();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [type, setType] = useState<ShopType>("sarees");
  const [busy, setBusy] = useState(false);
  const next = params.get("next");

  useEffect(() => {
    if (status === "guest") router.replace("/login");
    if (!profile) return;
    const pending = typeof window !== "undefined" ? (localStorage.getItem("ds_pending_role") as Role | null) : null;
    setRole(profile.role ?? pending);
    setName(profile.role === "seller" ? profile.shopName : (profile.name ?? ""));
    setCity(profile.city ?? "");
  }, [status, profile, router]);

  const save = async () => {
    if (!repo || !profile || !role) return;
    if (!name.trim()) return toast.error(role === "seller" ? t("needName") : tb("needName"));
    setBusy(true);
    try {
      const p =
        role === "seller"
          ? await repo.updateProfile({ role, shopName: name.trim().slice(0, 60), shopType: type, city: city.trim(), phone: whatsapp.trim() || profile.phone })
          : await repo.updateProfile({ role, name: name.trim().slice(0, 60), city: city.trim() });
      if (role === "seller") {
        await market.saveShop(p.id, { name: p.shopName, slug: p.shopName, city: p.city || "Hyderabad", whatsapp: whatsapp.replace(/\D/g, ""), shopType: type, delivery: "both" });
      }
      if (repo.kind === "local") addDeviceRole(role);
      localStorage.removeItem("ds_pending_role");
      setProfile(p);
      router.replace(next && (role === "seller" || !next.startsWith("/seller")) ? next : role === "seller" ? "/seller" : "/market");
    } catch {
      toast.error(t("needName"));
      setBusy(false);
    }
  };

  return (
    <AuthFrame>

  <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-3 pb-6" data-side={role ?? "buyer"}>
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      {!role ? (
        <>
          <h1 className="mt-4 font-display text-3xl font-bold">{tr("title")}</h1>
          <div className="mt-6 grid gap-3">
            {(
              [
                ["seller", "🏪", tr("sell"), tr("sellHint")],
                ["buyer", "🛍️", tr("buy"), tr("buyHint")],
              ] as const
            ).map(([r, e, title, hint]) => (
              <button key={r} type="button" onClick={() => setRole(r)} className="flex min-h-24 items-center gap-4 rounded-[var(--radius-card)] bg-paper p-4 text-left shadow-soft active:scale-[0.98]">
                <span className="text-4xl" aria-hidden>
                  {e}
                </span>
                <span>
                  <span className="block font-display text-xl font-bold">{title}</span>
                  <span className="text-ink-soft">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-display text-3xl font-bold">{role === "seller" ? tb("sellerTitle") : tb("buyerTitle")}</h1>
          {role === "seller" ? <p className="mt-3 rounded-2xl bg-saffron-100 px-4 py-3 text-lg font-semibold text-saffron-800">{t("freeCredits")}</p> : null}

          <label className="mt-6 grid gap-2 text-lg font-semibold">
            {role === "seller" ? t("shopName") : tb("yourName")}
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={role === "seller" ? t("shopNamePlaceholder") : tb("namePlaceholder")} autoComplete={role === "seller" ? "organization" : "name"} className={input} />
          </label>
          <label className="mt-4 grid gap-2 text-lg font-semibold">
            {tb("city")}
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tb("cityPlaceholder")} autoComplete="address-level2" className={input} />
          </label>

          {role === "seller" ? (
            <>
              <label className="mt-4 grid gap-2 text-lg font-semibold">
                {tb("whatsapp")}
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="98765 43210" inputMode="tel" autoComplete="tel" className={input} />
              </label>
              <fieldset className="mt-6">
                <legend className="text-lg font-semibold">{t("shopType")}</legend>
                <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup">
                  {SHOP_TYPES.map((s) => {
                    const Icon = SHOP_ICONS[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={type === s}
                        onClick={() => setType(s)}
                        className={cn(
                          "flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-[3px] bg-paper text-[14px] font-semibold shadow-soft transition active:scale-95",
                          type === s ? "border-accent" : "border-transparent",
                        )}
                      >
                        <Icon className="size-6 text-accent-strong" aria-hidden />
                        {ts(s)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          ) : null}

          <div className="mt-auto pt-8">
            <Button size="lg" block onClick={save} loading={busy}>
              {t("start")}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </>
      )}
    </main>
    </AuthFrame>
  );
}

export default function Onboarding() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
