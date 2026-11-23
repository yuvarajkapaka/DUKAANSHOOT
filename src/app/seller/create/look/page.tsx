"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { Check, Coins, Mic, Sparkles, Wand2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useAppConfig, useAuthed } from "@/components/providers";
import { LookOptions } from "@/components/seller/look-options";
import { StepHeader } from "@/components/step-header";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useCreateStore } from "@/lib/client/create-store";
import { JobError, startPhotos } from "@/lib/client/jobs";
import { listenOnce, parseVoice, voiceSupported } from "@/lib/client/voice";
import { quickPick } from "@/lib/types";

const PHOTO_COUNT = 4;

export default function LookPage() {
  const t = useTranslations("look");
  const tg = useTranslations("garment");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const config = useAppConfig();
  const { repo, profile, refreshProfile } = useAuthed();
  const { garment, look, setLook, setGarment } = useCreateStore();
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (!garment) router.replace("/seller/create/capture");
  }, [garment, router]);
  if (!garment) return null;

  const enough = profile.credits >= PHOTO_COUNT;

  const doQuickPick = () => {
    setLook(quickPick(garment.garmentType, profile.shopType), false);
    setPicked(true);
    toast.success(t("quickPicked"));
    setTimeout(() => setPicked(false), 1500);
  };

  const voice = async () => {
    if (!voiceSupported()) return toast(t("voiceUnsupported"));
    setListening(true);
    const { promise, stop } = listenOnce(locale);
    stopRef.current = stop;
    try {
      const text = await promise;
      const parsed = text ? parseVoice(text) : null;
      if (!parsed) {
        toast(t("voiceNothing"));
        return;
      }
      const { garment: g, ...rest } = parsed;
      if (g && g !== garment.garmentType) setGarment({ ...garment, garmentType: g });
      setLook(rest);
      toast.success(t("voiceHeard", { text: text.split(" | ")[0] }));
    } catch {
      toast(t("voiceUnsupported"));
    } finally {
      setListening(false);
    }
  };

  const make = async () => {
    setBusy(true);
    try {
      const id = await startPhotos({
        repo,
        config,
        garment,
        look,
        onSlow: () => toast(te("network"), { id: "slow" }),
      });
      void refreshProfile();
      router.push(`/seller/create/results/${id}`);
    } catch (e) {
      const code = e instanceof JobError ? e.code : "SERVER";
      if (code === "NO_CREDITS") toast.error(t("notEnough", { count: PHOTO_COUNT }));
      else if (code === "RATE_LIMIT") toast.error(te("rateLimit"));
      else if (code === "NETWORK") toast.error(te("network"));
      else toast.error(te("server"));
      void refreshProfile();
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader side="seller" back="/seller/create/capture" />
      <StepHeader step={2} title={t("title")} />

      <main className="mx-auto max-w-3xl px-4 pb-40">
        {/* item + quick actions */}
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] bg-paper p-3 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={garment.preview} alt={t("itemLabel")} className="size-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink-soft">{t("itemLabel")}</p>
            <p className="truncate text-lg font-bold">{tg(garment.garmentType)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button variant="dark" onClick={doQuickPick} className="relative px-3 whitespace-nowrap">
            <AnimatePresence mode="wait" initial={false}>
              {picked ? (
                <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check aria-hidden />
                </motion.span>
              ) : (
                <motion.span key="wand" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Wand2 aria-hidden />
                </motion.span>
              )}
            </AnimatePresence>
            {t("quickPick")}
          </Button>
          <Button variant="outline" onClick={voice} className="px-3 whitespace-nowrap">
            <Mic aria-hidden />
            {t("voice")}
          </Button>
        </div>
        <p className="mt-2 text-center text-[15px] text-ink-soft">{t("voiceHint")}</p>

        <LookOptions look={look} setLook={setLook} />
      </main>

      {/* sticky action */}
      <div className="fixed-bar safe-bottom z-20 border-t border-line bg-cream/95 px-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          {enough ? (
            <Button size="xl" block onClick={make} loading={busy}>
              {!busy ? <Sparkles aria-hidden /> : null}
              <span className="flex flex-col items-start leading-tight">
                <span>{t("makeN", { count: PHOTO_COUNT })}</span>
                <span className="text-[15px] font-medium">({t("usesCredits", { count: PHOTO_COUNT })})</span>
              </span>
            </Button>
          ) : (
            <>
              <p className="mb-2 text-center font-semibold text-danger">{t("notEnough", { count: PHOTO_COUNT })}</p>
              <Button asChild size="xl" block>
                <Link href="/seller/credits">
                  <Coins aria-hidden />
                  {tc("buyMore")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <Sheet open={listening} onOpenChange={(o) => !o && stopRef.current()} title={t("listening")}>
        <div className="flex flex-col items-center gap-4 pb-8">
          <motion.span
            className="flex size-28 items-center justify-center rounded-full bg-saffron-500"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <Mic className="size-12 text-ink" aria-hidden />
          </motion.span>
          <p className="text-center text-lg text-ink-soft">{t("voiceHint")}</p>
        </div>
      </Sheet>
    </>
  );
}
