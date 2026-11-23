"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoDraw } from "@/components/brand/logo-draw";
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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
      <LogoDraw />
      <h1 className="anim-rise mt-6 font-display text-4xl font-bold" style={{ animationDelay: "500ms" }}>
        {t("appName")}
      </h1>
      <p className="anim-rise mt-2 max-w-xs text-lg text-ink-soft" style={{ animationDelay: "700ms" }}>
        {t("tagline")}
      </p>
    </main>
  );
}
