"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { ArrowRight, Camera, ImageUp, Maximize, RefreshCw, RotateCw, Sun, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useAuthed } from "@/components/providers";
import { Studio } from "@/components/seller/studio";
import { StepHeader } from "@/components/step-header";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { SAMPLE_GARMENTS, sampleInputUrl } from "@/lib/art/samples";
import { useCreateStore } from "@/lib/client/create-store";
import { guessGarmentType } from "@/lib/client/detect";
import { cropAndCompress, makeThumb, MAX_INPUT_BYTES } from "@/lib/client/image";
import { useIsDesktop } from "@/lib/client/use-media";
import { GARMENT_TYPES, quickPick, type GarmentType } from "@/lib/types";

type Stage = "pick" | "crop" | "type";

function MobileCapture() {
  const t = useTranslations("capture");
  const tg = useTranslations("garment");
  const ts = useTranslations("samples");
  const tc = useTranslations("common");
  const router = useRouter();
  const { repo, profile } = useAuthed();
  const setGarment = useCreateStore((s) => s.setGarment);
  const setLook = useCreateStore((s) => s.setLook);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; preview: string } | null>(null);
  const [type, setType] = useState<GarmentType>("saree");

  useEffect(() => () => void (src && URL.revokeObjectURL(src)), [src]);

  const onFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t("notImage"));
    if (file.size > MAX_INPUT_BYTES) return toast.error(t("fileTooBig"));
    setSrc(URL.createObjectURL(file));
    setRotation(0);
    setZoom(1);
    setStage("crop");
  };

  const onCropDone = useCallback((_: Area, px: Area) => setArea(px), []);

  const applyCrop = async () => {
    if (!src || !area) return;
    setBusy(true);
    try {
      const blob = await cropAndCompress(src, area, rotation);
      const preview = await makeThumb(blob, 480);
      setResult({ blob, preview });
      setType(await guessGarmentType(blob, profile.shopType));
      setStage("type");
    } catch {
      toast.error(t("notImage"));
    } finally {
      setBusy(false);
    }
  };

  const confirmUpload = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const { uploadId } = await repo.saveUpload(result.blob, type);
      const thumb = await makeThumb(result.blob, 200);
      setGarment({ kind: "upload", uploadId, garmentType: type, preview: thumb });
      setLook({ ...quickPick(type, profile.shopType), ...profile.defaults }, false);
      router.push("/seller/create/look");
    } catch (e) {
      const code = (e as Error).message;
      toast.error(code === "TOO_BIG" ? t("fileTooBig") : code === "NOT_IMAGE" ? t("notImage") : t("notImage"));
      setBusy(false);
    }
  };

  const pickSample = (id: string) => {
    const s = SAMPLE_GARMENTS.find((x) => x.id === id)!;
    setGarment({ kind: "sample", sampleId: s.id, garmentType: s.garment, preview: sampleInputUrl(s.id) });
    setLook(s.look, false);
    router.push("/seller/create/look");
  };

  return (
    <>
      <AppHeader side="seller" back={stage === "pick" ? "/seller" : true} />
      <StepHeader step={1} title={stage === "crop" ? t("cropTitle") : stage === "type" ? t("weThink") : t("title")} />

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      <main className="mx-auto max-w-3xl px-4 pb-10">
        <AnimatePresence mode="wait">
          {stage === "pick" ? (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* tips */}
              <div className="mt-4 rounded-[var(--radius-card)] bg-night p-4 text-white">
                <p className="text-[15px] font-semibold text-saffron-300">{t("tipsTitle")}</p>
                <ul className="mt-2 grid gap-2">
                  {[
                    { icon: Layers, text: t("tipFlat") },
                    { icon: Sun, text: t("tipDaylight") },
                    { icon: Maximize, text: t("tipFill") },
                  ].map(({ icon: Icon, text }, i) => (
                    <motion.li key={text} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }} className="flex items-center gap-3 text-lg">
                      <span className="flex size-9 items-center justify-center rounded-full bg-white/10">
                        <Icon className="size-5 text-saffron-300" aria-hidden />
                      </span>
                      {text}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 grid gap-3">
                <Button size="xl" block onClick={() => cameraRef.current?.click()}>
                  <Camera aria-hidden />
                  {t("takePhoto")}
                </Button>
                <Button variant="outline" size="lg" block onClick={() => galleryRef.current?.click()}>
                  <ImageUp aria-hidden />
                  {t("gallery")}
                </Button>
              </div>

              <h2 className="mt-8 mb-3 text-lg font-bold">{t("orSample")}</h2>
              <div className="grid grid-cols-2 gap-3">
                {SAMPLE_GARMENTS.map((s, i) => (
                  <motion.button
                    key={s.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => pickSample(s.id)}
                    className="overflow-hidden rounded-[var(--radius-card)] bg-paper text-left shadow-soft"
                  >
                    <Image src={sampleInputUrl(s.id)} alt="" width={300} height={375} className="aspect-[4/3] w-full object-cover" />
                    <span className="block px-3 py-2.5 text-[15px] leading-snug font-semibold">{ts(s.nameKey)}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : null}

          {stage === "crop" && src ? (
            <motion.div key="crop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="mt-1 text-ink-soft">{t("cropHint")}</p>
              <div className="relative mt-4 aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-night">
                <Cropper
                  image={src}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={4 / 5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropDone}
                  objectFit="contain"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  <RotateCw aria-hidden />
                  {t("rotate")}
                </Button>
                <Button variant="outline" onClick={() => galleryRef.current?.click()}>
                  <RefreshCw aria-hidden />
                  {t("retake")}
                </Button>
              </div>
              <Button size="lg" block className="mt-3" onClick={applyCrop} loading={busy}>
                {busy ? t("preparing") : t("useThis")}
                {!busy ? <ArrowRight aria-hidden /> : null}
              </Button>
            </motion.div>
          ) : null}

          {stage === "type" && result ? (
            <motion.div key="type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="mt-1 text-ink-soft">{t("weThinkHint")}</p>
              <div className="mt-4 flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.preview} alt="" className="aspect-[4/5] w-32 shrink-0 rounded-2xl object-cover shadow-soft" />
                <ChipGroup label={t("weThink")}>
                  {GARMENT_TYPES.map((g) => (
                    <Chip key={g} selected={type === g} onClick={() => setType(g)}>
                      {tg(g)}
                    </Chip>
                  ))}
                </ChipGroup>
              </div>
              <div className="safe-bottom sticky bottom-0 mt-6 bg-cream pt-3">
                <Button size="lg" block onClick={confirmUpload} loading={busy}>
                  {tc("next")}
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </>
  );
}

/** Phones/tablets: one step per screen. Laptops/desktops: the 3-panel studio. */
export default function CapturePage() {
  return useIsDesktop() ? <Studio /> : <MobileCapture />;
}
