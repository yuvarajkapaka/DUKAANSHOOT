"use client";
import { AnimatePresence, m as motion, type PanInfo } from "framer-motion";
import { ArrowRight, Camera, Check, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogoDraw } from "@/components/brand/logo-draw";
import { setLocaleCookie } from "@/components/language-switcher";
import { AuthFrame } from "@/components/brand/auth-frame";
import { GoldRule, Zari } from "@/components/brand/ornaments";
import { Button } from "@/components/ui/button";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { EASE, iconSwap, pop, rise, slide, spring, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

const GREETING: Record<Locale, string> = { en: "Hello", te: "నమస్కారం", hi: "नमस्ते" };

/**
 * Illustrations for the 3 intro cards: Photo -> AI Model -> Sell.
 * Each plays a short, one-time entrance when its card arrives (onboarding is seen
 * once, so it can afford a little theatre) and then holds still, so nothing keeps
 * bobbing while the shopkeeper reads the words underneath.
 */
const frame = "shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_50%,transparent),0_26px_50px_-20px_rgb(21_18_46/0.55)]";

function IntroArt({ n }: { n: number }) {
  if (n === 0)
    // the garment, then a camera badge pops onto its corner with a shutter flash
    return (
      <div className="relative mx-auto h-56 w-48">
        <motion.div variants={rise} initial="hidden" animate="show" className="absolute inset-0">
          <Image src="/samples/garments/saree-red-silk.jpg" alt="" fill className={cn("arch-soft object-cover", frame)} sizes="192px" priority />
          <motion.span className="arch-soft absolute inset-0 bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ delay: 0.55, duration: 0.5, ease: EASE.out }} aria-hidden />
        </motion.div>
        <motion.span
          variants={pop}
          initial="hidden"
          animate="show"
          custom={0.35}
          className="edge-gold absolute -right-4 -bottom-4 flex size-16 items-center justify-center rounded-full bg-paper text-gold-deep shadow-[0_14px_30px_-12px_rgb(21_18_46/0.5)]"
        >
          <Camera className="size-7" aria-hidden />
        </motion.span>
      </div>
    );
  if (n === 1)
    // flat garment -> a zari spark travels across -> the model photo comes into focus
    return (
      <div className="relative mx-auto h-56 w-60">
        <motion.div variants={rise} initial="hidden" animate="show" className="absolute top-10 left-0">
          <Image src="/samples/garments/saree-red-silk.jpg" alt="" width={96} height={120} className="arch-soft object-cover shadow-[0_0_0_1px_var(--hairline),0_16px_32px_-16px_rgb(21_18_46/0.5)]" />
        </motion.div>
        <motion.span
          className="absolute top-[86px] left-[86px] z-10 text-gold drop-shadow-[0_2px_6px_rgb(192_138_46/0.55)]"
          initial={{ opacity: 0, x: -8, scale: 0.6, rotate: -45 }}
          animate={{ opacity: [0, 1, 1, 0], x: [-8, 6, 18, 26], scale: [0.6, 1.15, 1, 0.7], rotate: [-45, 0, 30, 60] }}
          transition={{ delay: 0.3, duration: 0.9, ease: EASE.inOut }}
          aria-hidden
        >
          <Zari className="size-7" />
        </motion.span>
        <motion.div
          className="absolute top-0 right-0"
          initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ ...spring.soft, delay: 0.75 }}
        >
          <Image src="/samples/results/saree-red-silk-1.jpg" alt="" width={140} height={175} className="arch-soft object-cover shadow-[0_0_0_2px_var(--card),0_0_0_3px_color-mix(in_oklab,var(--gold)_55%,transparent),0_26px_50px_-18px_rgb(21_18_46/0.55)]" priority />
        </motion.div>
      </div>
    );
  // a shop window fills tile by tile, then the first order lands
  return (
    <div className="relative mx-auto h-56 w-56">
      <motion.div variants={rise} initial="hidden" animate="show" className="panel-night absolute inset-x-6 top-0 bottom-0 rounded-[32px] p-2.5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_45%,transparent),0_26px_50px_-18px_rgb(21_18_46/0.55)]">
        <motion.div variants={stagger(0.09, 0.2)} initial="hidden" animate="show" className="grid grid-cols-2 gap-1.5">
          {["p-red-kanjivaram-1", "p-pink-kurti-2", "p-kids-yellow-frock-1", "p-cream-kurta-1"].map((s) => (
            <motion.div key={s} variants={pop}>
              <Image src={`/samples/market/${s}.jpg`} alt="" width={70} height={88} className="aspect-[4/5] w-full rounded-[10px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/0.12)]" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <motion.span
        className="absolute -right-2 bottom-6 inline-flex items-center gap-1.5 rounded-full bg-whatsapp px-3 py-1.5 text-sm font-bold text-white shadow-lg"
        initial={{ opacity: 0, y: 14, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spring.joy, delay: 0.75 }}
      >
        <ShoppingBag className="size-4" aria-hidden />
        +1
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
  // 1 = forward (the next card enters from the right), -1 = back
  const [dir, setDir] = useState(1);
  const go = (to: number) => {
    setDir(to > (typeof stage === "number" ? stage : -1) ? 1 : -1);
    setStage(to);
  };

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
      if (stage < 2) go(stage + 1);
      else finish();
    } else if (info.offset.x > 60 && stage > 0) go(stage - 1);
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
                "anim-rise card-lux flex min-h-24 items-center justify-between px-6 text-left transition-[translate,scale,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-warm active:scale-[0.98]",
                l === locale && "ring-2 ring-gold ring-offset-2 ring-offset-cream",
              )}
            >
              <span>
                <span className="block font-display text-[1.7rem] font-semibold">{LOCALE_LABELS[l].native}</span>
                <span className="text-base text-ink-soft">
                  {GREETING[l]} · {LOCALE_LABELS[l].english}
                </span>
              </span>
              <span className={cn("flex size-10 items-center justify-center rounded-full transition-colors", l === locale ? "bg-foil text-on-gold" : "edge")}>
                <AnimatePresence initial={false}>
                  {l === locale ? (
                    <motion.span key="c" {...iconSwap}>
                      <Check className="size-6" aria-hidden />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-8">
          <Button size="lg" block loading={pending} onClick={() => go(0)}>
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
        <AnimatePresence mode="wait" custom={dir}>
          <motion.section key={stage} custom={dir} variants={slide} initial="hidden" animate="show" exit="exit" className="text-center" aria-live="polite">
            <IntroArt n={stage} />
            <h1 className="mt-10 font-display text-[1.9rem] leading-tight font-semibold md:text-4xl">{ti(`s${stage + 1}t` as "s1t")}</h1>
            <GoldRule className="anim-draw-x-center mx-auto mt-4 w-32" style={{ animationDelay: "250ms" }} />
            <p className="mx-auto mt-3 max-w-xs text-lg text-ink-soft">{ti(`s${stage + 1}b` as "s1b")}</p>
          </motion.section>
        </AnimatePresence>
      </motion.div>
      <div className="my-6 flex justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((n) => (
          <span key={n} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-500 ease-out", n === stage ? "w-9 bg-[linear-gradient(90deg,var(--gold-light),var(--gold))]" : "w-1.5 bg-line")} />
        ))}
      </div>
      <Button size="lg" block onClick={() => (stage < 2 ? go(stage + 1) : finish())}>
        {stage < 2 ? ti("next") : ti("start")}
        <ArrowRight aria-hidden />
      </Button>
    </main>
    </AuthFrame>
  );
}
