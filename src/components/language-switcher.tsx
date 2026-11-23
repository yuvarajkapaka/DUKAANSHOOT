"use client";
import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useSession } from "./providers";
import { Sheet } from "./ui/sheet";

export function setLocaleCookie(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function useChangeLocale() {
  const router = useRouter();
  const session = useSession();
  const [pending, start] = useTransition();
  return {
    pending,
    change: (l: Locale) => {
      setLocaleCookie(l);
      if (session.repo && session.profile) {
        session.repo.updateProfile({ language: l }).then(session.setProfile).catch(() => {});
      }
      start(() => router.refresh());
    },
  };
}

/** Language switcher shown on every screen: globe + current language name. */
const SHORT: Record<Locale, string> = { en: "EN", te: "తె", hi: "हि" };

export function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const { change, pending } = useChangeLocale();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex min-h-12 items-center gap-1.5 rounded-full bg-paper px-3 text-[15px] font-semibold shadow-soft", className)}
      >
        <Languages className="size-5 text-accent-strong" aria-hidden />
        <span className="sr-only">{t("language")}: </span>
        <span>{compact ? SHORT[locale] : LOCALE_LABELS[locale].native}</span>
        {compact ? <span className="sr-only"> ({LOCALE_LABELS[locale].native})</span> : null}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t("language")}>
        <div className="grid gap-3 pb-4">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              disabled={pending}
              onClick={() => {
                change(l);
                setOpen(false);
              }}
              className={cn(
                "flex min-h-16 items-center justify-between rounded-2xl border-2 bg-paper px-5 text-left text-xl font-semibold transition-transform active:scale-[0.98]",
                l === locale ? "border-accent" : "border-line",
              )}
            >
              <span>
                {LOCALE_LABELS[l].native}
                {l !== "en" ? <span className="ml-2 text-base font-normal text-ink-soft">{LOCALE_LABELS[l].english}</span> : null}
              </span>
              {l === locale ? <Check className="size-6 text-accent-strong" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
