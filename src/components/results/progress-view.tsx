"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The AI generation screen: the garment floats with a soft glowing pulse,
 * a magic scan light sweeps across it, a ring fills smoothly and friendly
 * messages rotate. Transform + opacity only.
 */
export function ProgressView({ progress, slow, thumb }: { progress: number; slow: boolean; thumb?: string }) {
  const t = useTranslations("results");
  const te = useTranslations("errors");
  const p = Math.max(3, Math.min(100, Math.round(progress)));
  const step = p < 25 ? 1 : p < 50 ? 2 : p < 75 ? 3 : p < 92 ? 4 : 5;
  const R = 96;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center px-4 pt-4 text-center" role="status" aria-live="polite">
      <div className="relative flex size-64 items-center justify-center">
        {/* glow */}
        <span className="absolute inset-6 rounded-full bg-saffron-400/50 blur-2xl" style={{ animation: "glow-pulse 2.2s ease-in-out infinite" }} aria-hidden />
        {/* ring */}
        <svg viewBox="0 0 220 220" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="110" cy="110" r={R} fill="none" stroke="var(--s100)" strokeWidth="10" />
          <motion.circle
            cx="110"
            cy="110"
            r={R}
            fill="none"
            stroke="url(#ring)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - p / 100) }}
            transition={{ type: "spring", stiffness: 50, damping: 18 }}
          />
          <defs>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E8871E" />
              <stop offset="1" stopColor="#E11D48" />
            </linearGradient>
          </defs>
        </svg>
        {/* floating garment */}
        <motion.div
          className="relative h-44 w-36 overflow-hidden rounded-2xl border-4 border-white bg-paper shadow-2xl"
          animate={{ y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : null}
          {/* scan light */}
          <motion.span
            className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-white/80 to-transparent mix-blend-overlay"
            initial={{ y: "-100%" }}
            animate={{ y: ["-100%", "320%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-x-0 h-0.5 bg-saffron-300 shadow-[0_0_12px_4px_rgba(244,182,106,.8)]"
            initial={{ y: 0 }}
            animate={{ y: [0, 176, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        {/* sparkles */}
        {[
          [18, 30, 0],
          [210, 60, 0.6],
          [40, 200, 1.2],
          [196, 190, 0.9],
        ].map(([x, y, d], i) => (
          <motion.span
            key={i}
            className="absolute text-xl"
            style={{ left: x, top: y }}
            animate={{ scale: [0, 1.2, 0], rotate: [0, 90, 180], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: d }}
            aria-hidden
          >
            ✨
          </motion.span>
        ))}
      </div>

      <p className="mt-2 font-display text-4xl font-bold text-accent-strong tabular-nums">{p}%</p>
      <div className="h-16">
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="mt-1 font-display text-xl">
            {t(`progress${step}` as "progress1")}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="max-w-xs text-ink-soft">{t("waitNote")}</p>
      {slow ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-saffron-100 px-4 py-2 font-semibold text-saffron-800">
          <WifiOff className="size-5" aria-hidden />
          {te("network")}
        </p>
      ) : null}
    </div>
  );
}
