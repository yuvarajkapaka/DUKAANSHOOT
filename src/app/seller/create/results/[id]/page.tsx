"use client";
import { m as motion } from "framer-motion";
import { EASE, enter, expand, spring } from "@/lib/motion";
import { AlertTriangle, Camera, Download, Info, Loader2, RefreshCw, Rocket, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useAppConfig, useAuthed } from "@/components/providers";
import { ProgressView } from "@/components/results/progress-view";
import { Viewer } from "@/components/results/viewer";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { StepHeader } from "@/components/step-header";
import { BeforeAfter } from "@/components/ui/before-after";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { sampleInputUrl } from "@/lib/art/samples";
import { confetti } from "@/lib/client/effects";
import { downloadBlob } from "@/lib/client/image";
import { regenerateOne, runGeneration } from "@/lib/client/jobs";
import { addTextOverlay, hasOverlay, type OverlayText } from "@/lib/client/overlay";
import { sharePhotos } from "@/lib/client/share";
import type { Generation } from "@/lib/types";
import { cn } from "@/lib/utils";

type Confirm = { kind: "regen" | "delete"; imageId: string } | null;

export default function ResultsPage() {
  const t = useTranslations("results");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const tg = useTranslations("garment");
  const tl = useTranslations("look");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const config = useAppConfig();
  const { repo, profile, refreshProfile, setProfile } = useAuthed();

  const [gen, setGen] = useState<Generation | null | undefined>(undefined);
  const [progress, setProgress] = useState(3);
  const [slow, setSlow] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [regenerating, setRegenerating] = useState<Record<string, number>>({});
  const [overlayOn, setOverlayOn] = useState(false);
  const [overlay, setOverlay] = useState<OverlayText>({ shopName: profile.shopName, phone: profile.phone ?? "", price: "" });
  const [overlayUrls, setOverlayUrls] = useState<Record<string, string>>({});
  const [busyAll, setBusyAll] = useState<"share" | "download" | null>(null);
  const running = useRef(false);
  /** true when the photos finished while this screen was open → "develop" animation + confetti */
  const [justDone, setJustDone] = useState(false);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const g = await repo.getGeneration(id);
    setGen(g);
    return g;
  }, [repo, id]);

  // load + run / resume the job
  useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      const g = await reload();
      if (!g || g.status !== "running" || running.current) return;
      running.current = true;
      try {
        await runGeneration(
          repo,
          g,
          (u) => {
            if (u.slow) setSlow(true);
            if (u.progress >= 0) {
              setSlow(false);
              setProgress((p) => Math.max(p, u.progress));
            }
          },
          signal,
        );
        setProgress(100);
        if (!signal.cancelled) {
          setJustDone(true);
          setTimeout(() => void confetti({ y: 0.35 }), 450);
        }
      } catch {
        // failure state is stored on the generation
      } finally {
        running.current = false;
        if (!signal.cancelled) {
          await reload();
          void refreshProfile();
        }
      }
    })();
    return () => {
      signal.cancelled = true;
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, repo]);

  const images = useMemo(() => gen?.images ?? [], [gen]);

  // the plain item photo, for the before/after slider
  useEffect(() => {
    if (!gen) return;
    if (gen.source.kind === "sample") return setBeforeUrl(sampleInputUrl(gen.source.sampleId));
    let url: string | null = null;
    void repo.getUploadBlob(gen.source.uploadId).then((b) => {
      if (!b) return;
      url = URL.createObjectURL(b);
      setBeforeUrl(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [gen?.id, gen?.source, repo]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownImages = useMemo(() => images.map((im) => ({ id: im.id, url: (overlayOn && overlayUrls[im.id]) || im.url })), [images, overlayOn, overlayUrls]);
  const gridImages = useMemo(() => images.map((im) => ({ id: im.id, url: (overlayOn && overlayUrls[im.id]) || im.thumb || im.url })), [images, overlayOn, overlayUrls]);

  // build text-overlay previews (debounced)
  useEffect(() => {
    if (!overlayOn || !hasOverlay(overlay) || !gen) return;
    let cancelled = false;
    const created: string[] = [];
    const timer = setTimeout(async () => {
      const next: Record<string, string> = {};
      for (const im of images) {
        const blob = await repo.getImageBlob(gen.id, im.id);
        if (!blob || cancelled) continue;
        const url = URL.createObjectURL(await addTextOverlay(blob, overlay));
        created.push(url);
        next[im.id] = url;
      }
      if (!cancelled) setOverlayUrls(next);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setTimeout(() => created.forEach((u) => URL.revokeObjectURL(u)), 2000);
    };
  }, [overlayOn, overlay, images, gen, repo]);

  const blobFor = async (imageId: string) => {
    const blob = await repo.getImageBlob(id, imageId);
    if (!blob) throw new Error("NO_BLOB");
    return overlayOn && hasOverlay(overlay) ? addTextOverlay(blob, overlay) : blob;
  };

  const shareText = () => {
    const parts = [profile.shopName, overlay.price ? `₹${overlay.price}` : "", profile.phone ?? ""].filter(Boolean);
    return parts.join(" · ");
  };

  const handleShare = async (ids: string[]) => {
    try {
      const blobs = await Promise.all(ids.map(blobFor));
      const r = await sharePhotos(blobs, shareText());
      if (r === "fallback") toast(t("shareFallback"));
    } catch {
      toast.error(tc("somethingWrong"));
    }
  };

  const handleDownload = async (ids: string[]) => {
    try {
      for (const [i, imageId] of ids.entries()) downloadBlob(await blobFor(imageId), `${profile.shopName || "dukaanshoot"}-${i + 1}.jpg`.replace(/\s+/g, "-"));
      toast.success(t("downloaded"));
    } catch {
      toast.error(tc("somethingWrong"));
    }
  };

  const doRegenerate = async (imageId: string) => {
    if (!gen) return;
    if (profile.credits < 1) return toast.error(tl("notEnough", { count: 1 }));
    setRegenerating((r) => ({ ...r, [imageId]: 5 }));
    if (repo.kind === "local") setProfile({ ...profile, credits: profile.credits - 1 });
    try {
      await regenerateOne({
        repo,
        config,
        gen,
        imageId,
        onUpdate: (u) => u.progress >= 0 && setRegenerating((r) => ({ ...r, [imageId]: u.progress })),
      });
    } catch {
      toast.error(t("failed"));
    } finally {
      setRegenerating((r) => {
        const { [imageId]: _drop, ...rest } = r;
        void _drop;
        return rest;
      });
      await reload();
      void refreshProfile();
    }
  };

  const doDelete = async (imageId: string) => {
    await repo.deleteImage(id, imageId);
    toast(t("deleted"));
    const g = await reload();
    setViewer((v) => (v === null || !g?.images.length ? null : Math.min(v, g.images.length - 1)));
    if (!g || !g.images.length) router.replace("/seller");
  };

  /* -------------------------------------------------------------- render */
  if (gen === undefined) {
    return (
      <>
        <AppHeader side="seller" back="/seller" />
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-[var(--radius-card)]" />
          ))}
        </div>
      </>
    );
  }
  if (gen === null) {
    return (
      <>
        <AppHeader side="seller" back="/seller" />
        <p className="p-8 text-center text-lg">{te("notFound")}</p>
      </>
    );
  }

  return (
    <>
      <AppHeader side="seller" back="/seller" />
      <StepHeader step={3} title={t("title")} />

      {gen.status === "running" ? (
        <ProgressView progress={progress} slow={slow} thumb={gen.garmentThumb} />
      ) : gen.status === "failed" && !images.length ? (
        <div className="mx-auto max-w-3xl px-4 pt-8 text-center">
          <AlertTriangle className="mx-auto size-14 text-danger" aria-hidden />
          <p className="mt-4 text-xl font-bold">{t("failed")}</p>
          {gen.creditsUsed ? <p className="mt-2 text-lg text-leaf">{t("refunded", { count: gen.creditsUsed })}</p> : null}
          <Button size="lg" block className="mt-6" onClick={() => router.push("/seller/create/look")}>
            <RefreshCw aria-hidden />
            {tc("retry")}
          </Button>
        </div>
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-40 lg:px-6">
          {justDone ? (
            <motion.p variants={enter} initial="hidden" animate="show" className="mt-2 font-display text-2xl">
              {t("ready")} ✨
            </motion.p>
          ) : null}
          {gen.note === "sample" || gen.note === "fallback" ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-night px-3 py-1.5 text-sm font-semibold text-saffron-200">
              <Info className="size-4" aria-hidden />
              {gen.note === "sample" ? t("sampleNote") : t("fallbackNote")}
            </p>
          ) : null}

          <p className="mt-3 flex gap-2 rounded-2xl bg-saffron-50 p-3 text-[15px] text-ink">
            <Info className="mt-0.5 size-5 shrink-0 text-saffron-700" aria-hidden />
            {t("accuracy")}
          </p>

          {/* 2x2 grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {gridImages.map((im, i) => (
              <motion.button
                key={im.id}
                type="button"
                initial={justDone ? { opacity: 0, scale: 0.9, rotate: i % 2 ? 3 : -3 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ ...(justDone ? spring.joy : spring.soft), delay: (justDone ? 0.15 : 0) + i * (justDone ? 0.18 : 0.06) }}
                onClick={() => setViewer(i)}
                className={cn("relative overflow-hidden bg-paper shadow-soft", justDone ? "rounded-md p-1.5 pb-5" : "rounded-[var(--radius-card)]")}
                aria-label={t("photoN", { n: i + 1, total: shownImages.length })}
              >
                <span className="relative block overflow-hidden rounded-[inherit]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="aspect-[4/5] w-full object-cover" decoding="async" />
                  {justDone ? (
                    // Polaroid "developing": a blurred, washed-out copy fades away (opacity only)
                    <motion.span className="absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.4 + i * 0.18, duration: 1.1, ease: EASE.out }} aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.url} alt="" className="size-full scale-110 object-cover blur-md brightness-125 saturate-50" />
                    </motion.span>
                  ) : null}
                </span>
                {regenerating[im.id] !== undefined ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 font-bold text-night">
                    <Loader2 className="size-8 animate-spin text-saffron-700" aria-hidden />
                    {Math.round(regenerating[im.id])}%
                  </span>
                ) : null}
              </motion.button>
            ))}
          </div>

          <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
          {beforeUrl && images[0] ? (
            <section className="mt-5 lg:mt-0">
              <h2 className="mb-2 text-lg">{t("beforeAfter")}</h2>
              <BeforeAfter before={beforeUrl} after={images[0].url} />
            </section>
          ) : null}

          <div className="lg:sticky lg:top-24">
          {/* text overlay */}
          <section className="mt-5 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft lg:mt-0">
            <label className="flex min-h-12 cursor-pointer items-center gap-3">
              <Type className="size-6 text-saffron-700" aria-hidden />
              <span className="flex-1">
                <span className="block text-lg font-semibold">{t("overlay")}</span>
                <span className="text-[15px] text-ink-soft">{t("overlayHint")}</span>
              </span>
              <input type="checkbox" checked={overlayOn} onChange={(e) => setOverlayOn(e.target.checked)} className="peer sr-only" />
              <span className={cn("relative h-8 w-14 rounded-full transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-saffron-600", overlayOn ? "bg-accent" : "bg-line")} aria-hidden>
                <span className={cn("absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform", overlayOn && "translate-x-6")} />
              </span>
            </label>
            {overlayOn ? (
              <motion.div {...expand} className="mt-3 grid gap-3 overflow-hidden">
                {(
                  [
                    ["shopName", t("shopName"), "text", ""],
                    ["price", t("price"), "numeric", t("pricePlaceholder")],
                    ["phone", t("phone"), "tel", "98765 43210"],
                  ] as const
                ).map(([key, label, mode, ph]) => (
                  <label key={key} className="grid gap-1 text-[15px] font-semibold">
                    {label}
                    <input
                      inputMode={mode === "text" ? "text" : mode}
                      value={overlay[key] ?? ""}
                      placeholder={ph}
                      onChange={(e) => setOverlay((o) => ({ ...o, [key]: e.target.value }))}
                      className="min-h-12 rounded-xl border-2 border-line bg-cream px-3 text-lg font-normal outline-none focus:border-saffron-500"
                    />
                  </label>
                ))}
              </motion.div>
            ) : null}
          </section>

          <Button
            variant="outline"
            size="lg"
            block
            className="mt-4"
            loading={busyAll === "download"}
            onClick={async () => {
              setBusyAll("download");
              await handleDownload(images.map((i) => i.id));
              setBusyAll(null);
            }}
          >
            <Download aria-hidden />
            {t("downloadAll")}
          </Button>
          <Button asChild variant="ghost" size="lg" block className="mt-2">
            <Link href="/seller/create/capture">
              <Camera aria-hidden />
              {t("makeMore")}
            </Link>
          </Button>
          <p className="mt-1 text-center text-[15px] text-ink-soft">{tg(gen.garmentType)}</p>
          </div>
          </div>
        </main>
      )}

      {gen.status !== "running" && images.length ? (
        <div className="fixed-bar safe-bottom z-20 border-t border-line bg-cream/95 px-5 pt-3 backdrop-blur-md">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
            <Button size="lg" className="px-3" onClick={() => router.push(`/seller/products/new?gen=${gen.id}`)}>
              <Rocket aria-hidden />
              {t("sellThis")}
            </Button>
            <Button
              variant="whatsapp"
              size="lg"
              className="px-3"
              loading={busyAll === "share"}
              onClick={async () => {
                setBusyAll("share");
                await handleShare(images.map((i) => i.id));
                setBusyAll(null);
              }}
            >
              <WhatsAppIcon />
              {t("share")}
            </Button>
          </div>
        </div>
      ) : null}

      <Viewer
        images={shownImages}
        index={viewer}
        onIndex={setViewer}
        onClose={() => setViewer(null)}
        onDownload={(imageId) => handleDownload([imageId])}
        onShare={(imageId) => handleShare([imageId])}
        onRegenerate={(imageId) => setConfirm({ kind: "regen", imageId })}
        onDelete={(imageId) => setConfirm({ kind: "delete", imageId })}
      />

      <Sheet open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title={confirm?.kind === "regen" ? t("regenerate") : t("delete")} description={confirm?.kind === "regen" ? t("regenerateCost") : t("deleteConfirm")}>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            {tc("no")}
          </Button>
          <Button
            variant={confirm?.kind === "delete" ? "danger" : "primary"}
            onClick={() => {
              const c = confirm!;
              setConfirm(null);
              setViewer(null);
              if (c.kind === "regen") void doRegenerate(c.imageId);
              else void doDelete(c.imageId);
            }}
          >
            {confirm?.kind === "regen" ? <RefreshCw aria-hidden /> : null}
            {tc("yes")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
