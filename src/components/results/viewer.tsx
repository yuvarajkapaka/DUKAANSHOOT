"use client";
import { AnimatePresence, m as motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, RefreshCw, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "./whatsapp-icon";

export interface ViewerImage {
  id: string;
  url: string;
}

/** Full-screen photo viewer: swipe left/right, big actions at the bottom. */
export function Viewer({
  images,
  index,
  onIndex,
  onClose,
  onDownload,
  onShare,
  onRegenerate,
  onDelete,
}: {
  images: ViewerImage[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("results");
  const tc = useTranslations("common");
  const open = index !== null && images[index];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index! < images.length - 1) onIndex(index! + 1);
      if (e.key === "ArrowLeft" && index! > 0) onIndex(index! - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, onClose, onIndex]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (index === null) return;
    if (info.offset.x < -60 && index < images.length - 1) onIndex(index + 1);
    else if (info.offset.x > 60 && index > 0) onIndex(index - 1);
    else if (info.offset.y > 120) onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-night"
          role="dialog"
          aria-modal="true"
          aria-label={t("photoN", { n: index! + 1, total: images.length })}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between px-3 pt-[max(8px,env(safe-area-inset-top))] text-white">
            <span className="pl-2 text-lg font-semibold">{t("photoN", { n: index! + 1, total: images.length })}</span>
            <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 font-semibold" aria-label={tc("close")}>
              <X className="size-7" aria-hidden />
              {tc("close")}
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.img
                key={images[index!].id}
                src={images[index!].url}
                alt={t("photoN", { n: index! + 1, total: images.length })}
                className="max-h-full max-w-full touch-pan-y object-contain select-none"
                drag
                dragSnapToOrigin
                dragElastic={0.6}
                onDragEnd={onDragEnd}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                draggable={false}
              />
            </AnimatePresence>
            {index! > 0 ? (
              <button type="button" onClick={() => onIndex(index! - 1)} className="absolute left-2 flex size-12 items-center justify-center rounded-full bg-white/15 text-white" aria-label={tc("back")}>
                <ChevronLeft className="size-7" aria-hidden />
              </button>
            ) : null}
            {index! < images.length - 1 ? (
              <button type="button" onClick={() => onIndex(index! + 1)} className="absolute right-2 flex size-12 items-center justify-center rounded-full bg-white/15 text-white" aria-label={tc("next")}>
                <ChevronRight className="size-7" aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex justify-center gap-2 py-2" aria-hidden>
            {images.map((im, i) => (
              <span key={im.id} className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-saffron-500" : "w-2 bg-white/40"}`} />
            ))}
          </div>

          <div className="safe-bottom grid grid-cols-2 gap-2 bg-night px-4 pt-2">
            <Button variant="whatsapp" onClick={() => onShare(images[index!].id)}>
              <WhatsAppIcon />
              {t("share")}
            </Button>
            <Button variant="primary" onClick={() => onDownload(images[index!].id)}>
              <Download aria-hidden />
              {t("download")}
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white" onClick={() => onRegenerate(images[index!].id)}>
              <RefreshCw aria-hidden />
              {t("regenerate")}
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white" onClick={() => onDelete(images[index!].id)}>
              <Trash2 aria-hidden />
              {t("delete")}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
