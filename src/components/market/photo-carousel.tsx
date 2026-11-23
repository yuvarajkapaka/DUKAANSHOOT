"use client";
import { AnimatePresence, m as motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useEffect, useLayoutEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SmartImage } from "../ui/smart-image";
import { Zoomable } from "../ui/zoomable";

/**
 * Swipe between product photos (dots below). Tap → full screen with
 * pinch-to-zoom. The first photo is the shared-element target of the
 * product card's View Transition.
 */
export const PhotoCarousel = forwardRef<HTMLDivElement, { images: string[]; alt: string; overlay?: React.ReactNode }>(function PhotoCarousel({ images, alt, overlay }, heroRef) {
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  // mouse hover-zoom (desktop): transform-origin follows the cursor
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  // tell the card→page View Transition that the hero is on screen
  useLayoutEffect(() => {
    const w = window as Window & { __heroReady?: () => void };
    requestAnimationFrame(() => w.__heroReady?.());
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const go = (d: number) => setI((x) => Math.max(0, Math.min(images.length - 1, x + d)));
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 50 || info.velocity.x > 400) go(-1);
  };

  return (
    <>
      <div className="relative lg:grid lg:grid-cols-[76px_minmax(0,1fr)] lg:gap-3">
        {/* desktop thumbnails */}
        {images.length > 1 ? (
          <div className="hidden flex-col gap-2 lg:flex" role="tablist" aria-label={alt}>
            {images.map((src, n) => (
              <button
                key={src + n}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={t("photo", { n: n + 1, total: images.length })}
                onClick={() => setI(n)}
                onMouseEnter={() => setI(n)}
                className={cn("relative aspect-[4/5] overflow-hidden rounded-xl border-2 bg-saffron-50 transition-colors", n === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <SmartImage src={src} alt="" sizes="76px" />
              </button>
            ))}
          </div>
        ) : (
          <span className="hidden lg:block" />
        )}
        {/* Rangoli Grid: the photo sits in a teal tile */}
        <div className="anim-pop-in rounded-[28px] bg-[#0F766E] p-2 shadow-warm md:p-3">
        <div
          ref={heroRef}
          className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-saffron-50 [@media(hover:hover)]:cursor-zoom-in"
          style={{ viewTransitionName: "product-hero" }}
          onMouseMove={(e) => {
            if (window.innerWidth < 1024) return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <motion.div
            className="flex h-full touch-pan-y"
            drag={images.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            animate={{ x: `${-i * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {images.map((src, n) => (
              <button
                key={src + n}
                type="button"
                onClick={() => setFull(true)}
                className="relative h-full w-full shrink-0"
                aria-label={t("photo", { n: n + 1, total: images.length })}
              >
                <span
                  className="absolute inset-0 transition-transform duration-200 ease-out"
                  style={zoom && n === i ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                >
                  <SmartImage src={src} alt={n === 0 ? alt : ""} priority={n === 0} sizes="(max-width: 1023px) 100vw, 640px" />
                </span>
              </button>
            ))}
          </motion.div>
          {overlay}
        </div>
        </div>
        {images.length > 1 ? (
          <div className="mt-3 flex justify-center gap-2 lg:hidden" role="tablist" aria-label={alt}>
            {images.map((_, n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={t("photo", { n: n + 1, total: images.length })}
                onClick={() => setI(n)}
                className="flex h-6 min-w-6 items-center justify-center"
              >
                <span className={cn("h-2 rounded-full transition-all duration-300", n === i ? "w-6 bg-ink" : "w-2 bg-line")} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {full ? (
          <motion.div className="fixed inset-0 z-[60] flex flex-col bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={alt}>
            <div className="safe-top flex items-center justify-between px-3 text-white">
              <span className="pl-2 font-semibold">{t("photo", { n: i + 1, total: images.length })}</span>
              <button type="button" onClick={() => setFull(false)} className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 font-semibold">
                <X className="size-7" aria-hidden />
                {tc("close")}
              </button>
            </div>
            <Zoomable key={i} className="flex-1" onSwipe={go} onSwipeDown={() => setFull(false)}>
              <div className="relative size-full">
                <SmartImage src={images[i]} alt={alt} sizes="100vw" className="!object-contain" />
              </div>
            </Zoomable>
            <div className="safe-bottom flex justify-center gap-2 pt-2" aria-hidden>
              {images.map((_, n) => (
                <span key={n} className={cn("h-2 rounded-full transition-all", n === i ? "w-6 bg-accent" : "w-2 bg-white/40")} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
});
