"use client";
import { m as motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Generation } from "@/lib/types";

/** Thumbnail of one photo session (used on Home). */
export function GenerationCard({ gen, index }: { gen: Generation; index: number }) {
  const t = useTranslations("garment");
  const cover = gen.images[0]?.thumb ?? gen.images[0]?.url;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }}>
      <Link href={`/seller/create/results/${gen.id}`} className="group block overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
        <div className="relative aspect-[4/5] bg-saffron-50">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={t(gen.garmentType)} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-active:scale-[1.03]" />
          ) : gen.status === "running" ? (
            <div className="skeleton flex size-full items-center justify-center">
              <Loader2 className="relative z-10 size-8 animate-spin text-saffron-700" aria-hidden />
            </div>
          ) : (
            <div className="flex size-full items-center justify-center text-ink-soft">
              <AlertCircle className="size-8" aria-hidden />
            </div>
          )}
          {gen.images.length > 1 ? (
            <span className="absolute right-2 bottom-2 rounded-full bg-night/80 px-2.5 py-0.5 text-sm font-semibold text-white">{gen.images.length}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          {gen.garmentThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gen.garmentThumb} alt="" className="size-8 rounded-lg object-cover" />
          ) : null}
          <span className="truncate text-[15px] font-semibold">{t(gen.garmentType)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
