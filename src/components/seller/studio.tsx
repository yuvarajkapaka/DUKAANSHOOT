"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { spring } from "@/lib/motion";
import { Check, ClipboardPaste, Coins, ExternalLink, ImageUp, Rocket, Sparkles, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useAppConfig, useAuthed } from "@/components/providers";
import { ProgressView } from "@/components/results/progress-view";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { SAMPLE_GARMENTS, sampleInputUrl } from "@/lib/art/samples";
import { useCreateStore } from "@/lib/client/create-store";
import { guessGarmentType } from "@/lib/client/detect";
import { confetti } from "@/lib/client/effects";
import { cropAndCompress, loadImage, makeThumb, MAX_INPUT_BYTES } from "@/lib/client/image";
import { JobError, runGeneration, startPhotos } from "@/lib/client/jobs";
import { GARMENT_TYPES, quickPick, type Generation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LookOptions } from "./look-options";

const PHOTO_COUNT = 4;

/**
 * Laptop/desktop photo studio: one page, three panels —
 *   upload (drag & drop · click · Ctrl+V paste) | model & background | live results.
 * Phones use the 3-step flow instead.
 */
export function Studio() {
  const t = useTranslations("capture");
  const tl = useTranslations("look");
  const tr = useTranslations("results");
  const tg = useTranslations("garment");
  const ts = useTranslations("samples");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const router = useRouter();
  const config = useAppConfig();
  const { repo, profile, refreshProfile } = useAuthed();
  const { garment, look, setGarment, setLook } = useCreateStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gen, setGen] = useState<Generation | null>(null);
  const [running, setRunning] = useState(false);

  const takeFile = useCallback(
    async (file?: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) return toast.error(t("notImage"));
      if (file.size > MAX_INPUT_BYTES) return toast.error(t("fileTooBig"));
      setPreparing(true);
      const src = URL.createObjectURL(file);
      try {
        const img = await loadImage(src);
        const blob = await cropAndCompress(src, { x: 0, y: 0, width: img.width, height: img.height }, 0);
        const type = await guessGarmentType(blob, profile.shopType);
        const { uploadId } = await repo.saveUpload(blob, type);
        setGarment({ kind: "upload", uploadId, garmentType: type, preview: await makeThumb(blob, 480) });
        setLook({ ...quickPick(type, profile.shopType), ...profile.defaults }, false);
        setGen(null);
      } catch {
        toast.error(t("notImage"));
      } finally {
        URL.revokeObjectURL(src);
        setPreparing(false);
      }
    },
    [profile, repo, setGarment, setLook, t],
  );

  // Ctrl+V / ⌘+V pastes an image from the clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        void takeFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFile]);

  const make = async () => {
    if (!garment) return;
    setBusy(true);
    try {
      const id = await startPhotos({ repo, config, garment, look, onSlow: () => toast(te("network"), { id: "slow" }) });
      void refreshProfile();
      const g = await repo.getGeneration(id);
      if (!g) throw new JobError("SERVER");
      setGen(g);
      setProgress(3);
      setRunning(true);
      await runGeneration(repo, g, (u) => u.progress >= 0 && setProgress((p) => Math.max(p, u.progress)), { cancelled: false });
      setGen(await repo.getGeneration(id));
      setTimeout(() => void confetti({ y: 0.35 }), 300);
    } catch (e) {
      const code = e instanceof JobError ? e.code : "SERVER";
      toast.error(code === "NO_CREDITS" ? tl("notEnough", { count: PHOTO_COUNT }) : code === "RATE_LIMIT" ? te("rateLimit") : te("server"));
      if (gen) setGen(await repo.getGeneration(gen.id));
    } finally {
      setRunning(false);
      setBusy(false);
      void refreshProfile();
    }
  };

  const enough = profile.credits >= PHOTO_COUNT;

  return (
    <>
      <AppHeader side="seller" title={tl("title")} />
      <main className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-5 px-6 pb-10 min-[1400px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* 1 · upload */}
        <section className="rounded-[var(--radius-card)] bg-paper p-5 shadow-soft min-[1400px]:sticky min-[1400px]:top-24" aria-labelledby="st-1">
          <h2 id="st-1" className="text-lg">
            1 · {t("title")}
          </h2>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => takeFile(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void takeFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "relative mt-3 flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-lux)] border-2 border-dashed bg-cream-deep/40 text-center transition-colors",
              dragging ? "border-accent bg-accent-soft" : "border-line hover:border-accent hover:bg-saffron-50",
            )}
          >
            {garment ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={garment.preview} alt={tl("itemLabel")} className="absolute inset-0 size-full object-cover" />
            ) : (
              <>
                <ImageUp className="size-12 text-accent-strong" aria-hidden />
                <span className="px-6 font-semibold">{t("gallery")}</span>
                <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <ClipboardPaste className="size-4" aria-hidden />
                  Ctrl + V
                </span>
              </>
            )}
            {preparing ? <span className="skeleton absolute inset-0" aria-label={t("preparing")} /> : null}
          </button>
          {garment ? (
            <div className="mt-4">
              <p className="mb-2 font-semibold">{t("weThink")}</p>
              <ChipGroup label={t("weThink")}>
                {GARMENT_TYPES.map((g) => (
                  <Chip key={g} selected={garment.garmentType === g} onClick={() => setGarment({ ...garment, garmentType: g })}>
                    {tg(g)}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          ) : null}
          <p className="mt-5 mb-2 text-sm font-semibold text-ink-soft">{t("orSample")}</p>
          <div className="grid grid-cols-4 gap-2">
            {SAMPLE_GARMENTS.map((s) => (
              <button
                key={s.id}
                type="button"
                title={ts(s.nameKey)}
                aria-label={ts(s.nameKey)}
                onClick={() => {
                  setGarment({ kind: "sample", sampleId: s.id, garmentType: s.garment, preview: sampleInputUrl(s.id) });
                  setLook(s.look, false);
                  setGen(null);
                }}
                className={cn("overflow-hidden rounded-xl border-2 transition-transform hover:-translate-y-0.5", garment?.kind === "sample" && garment.sampleId === s.id ? "border-accent" : "border-transparent")}
              >
                <Image src={sampleInputUrl(s.id)} alt="" width={120} height={150} sizes="90px" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* 2 · look */}
        <section className="col-start-2 row-span-2 row-start-1 rounded-[var(--radius-card)] bg-paper p-5 shadow-soft min-[1400px]:row-span-1" aria-labelledby="st-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 id="st-2" className="text-lg">
              2 · {tl("title")}
            </h2>
            <Button
              variant="dark"
              size="sm"
              className="whitespace-nowrap"
              disabled={!garment}
              onClick={() => {
                if (!garment) return;
                setLook(quickPick(garment.garmentType, profile.shopType), false);
                toast.success(tl("quickPicked"));
              }}
            >
              <Wand2 aria-hidden />
              {tl("quickPick")}
            </Button>
          </div>
          <LookOptions look={look} setLook={setLook} panel />
        </section>

        {/* 3 · results */}
        <section className="rounded-[var(--radius-card)] bg-paper p-5 shadow-soft min-[1400px]:sticky min-[1400px]:col-start-3 min-[1400px]:row-start-1 min-[1400px]:top-24" aria-labelledby="st-3" aria-live="polite">
          <h2 id="st-3" className="text-lg">
            3 · {tr("title")}
          </h2>
          {enough ? (
            <Button size="lg" block className="mt-3" disabled={!garment || busy} loading={busy && !running} onClick={make}>
              <Sparkles aria-hidden />
              {tl("makeN", { count: PHOTO_COUNT })}
            </Button>
          ) : (
            <Button asChild size="lg" block className="mt-3">
              <Link href="/seller/credits">
                <Coins aria-hidden />
                {tc("buyMore")}
              </Link>
            </Button>
          )}
          <div className="mt-4">
            {running && gen ? (
              <div className="origin-top scale-90">
                <ProgressView progress={progress} slow={false} thumb={gen.garmentThumb} />
              </div>
            ) : gen?.images.length ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {gen.images.map((im, i) => (
                      <motion.div key={im.id} initial={{ opacity: 0, scale: 0.9, rotate: i % 2 ? 3 : -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ ...spring.joy, delay: i * 0.15 }} className="overflow-hidden rounded-xl bg-saffron-50 shadow-soft">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={im.thumb ?? im.url} alt={tr("photoN", { n: i + 1, total: gen.images.length })} className="aspect-[4/5] w-full object-cover" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="mt-4 grid gap-2">
                  <Button onClick={() => router.push(`/seller/products/new?gen=${gen.id}`)}>
                    <Rocket aria-hidden />
                    {tr("sellThis")}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/seller/create/results/${gen.id}`}>
                      <ExternalLink aria-hidden />
                      {tr("share")} · {tr("download")}
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex aspect-[4/5] items-center justify-center rounded-xl border-2 border-dashed border-line text-line">
                    {garment ? <Check className="size-6 text-ink-soft/40" /> : <Sparkles className="size-6" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
