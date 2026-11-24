"use client";
import { AnimatePresence, m as motion, type PanInfo } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogoDraw } from "@/components/brand/logo-draw";
import { setLocaleCookie } from "@/components/language-switcher";
import { AuthFrame } from "@/components/brand/auth-frame";
import { GoldRule } from "@/components/brand/ornaments";
import { Button } from "@/components/ui/button";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const GREETING: Record<Locale, string> = { en: "Hello", te: "నమస్కారం", hi: "नमस्ते" };

/** Illustrations for the 3 intro cards: Photo → AI Model → Sell. */
function IntroArt({ n }: { n: number }) {
  if (n === 0)
    return (
      <div className="relative mx-auto h-56 w-48">
        <Image src="/samples/garments/saree-red-silk.jpg" alt="" fill className="arch-soft object-cover shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_50%,transparent),0_26px_50px_-20px_rgb(21_18_46/0.55)]" sizes="192px" priority />
        <motion.span className="edge-gold absolute -right-4 -bottom-4 flex size-16 items-center justify-center rounded-full bg-paper text-3xl shadow-[0_14px_30px_-12px_rgb(21_18_46/0.5)]" animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          📷
        </motion.span>
      </div>
    );
  if (n === 1)
    return (
      <div className="relative mx-auto h-56 w-60">
        <Image src="/samples/garments/saree-red-silk.jpg" alt="" width={96} height={120} className="arch-soft absolute top-10 left-0 object-cover shadow-[0_0_0_1px_var(--hairline),0_16px_32px_-16px_rgb(21_18_46/0.5)]" />
        <motion.span className="absolute top-20 left-[88px] text-3xl" animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          ✨
        </motion.span>
        <Image src="/samples/results/saree-red-silk-1.jpg" alt="" width={140} height={175} className="arch-soft absolute top-0 right-0 object-cover shadow-[0_0_0_2px_var(--card),0_0_0_3px_color-mix(in_oklab,var(--gold)_55%,transparent),0_26px_50px_-18px_rgb(21_18_46/0.55)]" priority />
      </div>
    );
  return (
    <div className="relative mx-auto h-56 w-56">
      <div className="panel-night absolute inset-x-6 top-0 bottom-0 rounded-[32px] p-2.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_45%,transparent),0_26px_50px_-18px_rgb(21_18_46/0.55)]">
        <div className="grid grid-cols-2 gap-1.5">
          {["p-red-kanjivaram-1", "p-pink-kurti-2", "p-kids-yellow-frock-1", "p-cream-kurta-1"].map((s) => (
            <Image key={s} src={`/samples/market/${s}.jpg`} alt="" width={70} height={88} className="aspect-[4/5] w-full rounded-[10px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/0.12)]" />
          ))}
        </div>
      </div>
      <motion.span className="absolute -right-2 bottom-6 rounded-full bg-[#128C4B] px-3 py-1.5 text-sm font-bold text-white shadow-lg" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
        🛍️ +1
      </motion.span>
    </div>
  );
}

export default function Welcome() {
  const t = useTranslations("welcome");
  const ti = useTranslations("intro");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stage, setStage] = useState<"lang" | number>("lang");

  const pick = (l: Locale) => {
    setLocaleCookie(l);
    start(() => router.refresh());
  };
  const finish = () => {
    setLocaleCookie(locale);
    router.replace("/login");
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (typeof stage !== "number") return;
    if (info.offset.x < -60) {
      if (stage < 2) setStage(stage + 1);
      else finish();
    }
    else if (info.offset.x > 60 && stage > 0) setStage(stage - 1);
  };

  if (stage === "lang") {
    return (
      <AuthFrame>
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <LogoDraw size={52} />
          <div>
            <h1 className="font-display text-[1.8rem] leading-tight font-semibold">{t("title")}</h1>
            <p className="text-lg text-ink-soft">{t("subtitle")}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4" role="radiogroup" aria-label={t("subtitle")}>
          {LOCALES.map((l, i) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={l === locale}
              style={{ animationDelay: `${i * 70}ms` }}
              onClick={() => pick(l)}
              className={cn(
                "anim-rise card-lux flex min-h-24 items-center justify-between px-6 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 active:scale-[0.97]",
                l === locale && "ring-2 ring-gold ring-offset-2 ring-offset-cream",
              )}
            >
              <span>
                <span className="block font-display text-[1.7rem] font-semibold">{LOCALE_LABELS[l].native}</span>
                <span className="text-base text-ink-soft">
                  {GREETING[l]} · {LOCALE_LABELS[l].english}
                </span>
              </span>
              <span className={cn("flex size-10 items-center justify-center rounded-full transition-colors", l === locale ? "bg-[linear-gradient(135deg,#fff3d4,#e9c877_45%,#c08a2e)] text-[#2b1d05]" : "edge")}>
                {l === locale ? <Check className="size-6" aria-hidden /> : null}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-8">
          <Button size="lg" block loading={pending} onClick={() => setStage(0)}>
            {t("continue")}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </main>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>

  <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-hidden px-4 pt-6 pb-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={finish}>
          {ti("skip")}
        </Button>
      </div>
      <motion.div className="flex flex-1 touch-pan-y flex-col justify-center" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.3} onDragEnd={onDragEnd}>
        <AnimatePresence mode="wait">
          <motion.section
            key={stage}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="text-center"
            aria-live="polite"
          >
            <IntroArt n={stage} />
            <h1 className="mt-10 font-display text-[1.9rem] leading-tight font-semibold md:text-4xl">{ti(`s${stage + 1}t` as "s1t")}</h1>
            <GoldRule className="mx-auto mt-4 w-32" />
            <p className="mx-auto mt-3 max-w-xs text-lg text-ink-soft">{ti(`s${stage + 1}b` as "s1b")}</p>
          </motion.section>
        </AnimatePresence>
      </motion.div>
      <div className="my-6 flex justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((n) => (
          <span key={n} className={cn("h-1.5 rounded-full transition-all duration-400", n === stage ? "w-9 bg-[linear-gradient(90deg,var(--gold-light),var(--gold))]" : "w-1.5 bg-line")} />
        ))}
      </div>
      <Button size="lg" block onClick={() => (stage < 2 ? setStage(stage + 1) : finish())}>
        {stage < 2 ? ti("next") : ti("start")}
        <ArrowRight aria-hidden />
      </Button>
    </main>
    </AuthFrame>
  );
}
