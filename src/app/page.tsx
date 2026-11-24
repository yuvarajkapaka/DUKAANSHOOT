"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoDraw } from "@/components/brand/logo-draw";
import { GoldRule, Grain, Jaali, RangoliMotif } from "@/components/brand/ornaments";
import { useSession } from "@/components/providers";
import { LOCALE_COOKIE } from "@/i18n/config";

/** Splash (logo draws itself) → first visit: language + intro → sellers to their dashboard, everyone else to the marketplace. */
export default function Splash() {
  const t = useTranslations("common");
  const { status, profile } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    const timer = setTimeout(() => {
      const chosen = document.cookie.split("; ").some((c) => c.startsWith(LOCALE_COOKIE + "="));
      if (!chosen) router.replace("/welcome");
      else router.replace(profile?.role === "seller" ? "/seller" : "/market");
    }, 1300);
    return () => clearTimeout(timer);
  }, [status, profile, router]);

  return (
    <main className="panel-night relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* two vast rangoli mandalas turning behind the mark */}
      <RangoliMotif className="spin-slow absolute -top-[22%] -left-[28%] size-[85vmin] text-gold-light opacity-[0.07]" />
      <RangoliMotif className="spin-slow absolute -right-[32%] -bottom-[26%] size-[70vmin] text-accent opacity-[0.09]" />
      <Jaali className="text-gold-light opacity-[0.07]" />
      <Grain />

      <div className="relative">
        <span aria-hidden className="absolute inset-[-28%] rounded-full bg-accent/25 blur-3xl" style={{ animation: "glow-pulse 3.4s ease-in-out infinite" }} />
        <LogoDraw />
      </div>

      <h1 className="anim-rise text-foil mt-7 font-display text-4xl font-semibold" style={{ animationDelay: "500ms" }}>
        {t("appName")}
      </h1>
      <GoldRule className="anim-fade mt-4 w-40" />
      <p className="anim-rise mt-4 max-w-xs text-lg text-[#e8e3f5]/75" style={{ animationDelay: "700ms" }}>
        {t("tagline")}
      </p>
    </main>
  );
}
