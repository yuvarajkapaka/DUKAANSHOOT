"use client";
import { m as motion } from "framer-motion";
import { useEffect } from "react";
import { confetti, haptic } from "@/lib/client/effects";

/** Animated checkmark that draws itself (order placed, product listed). */
export function DrawnCheck({ size = 112 }: { size?: number }) {
  return (
    <motion.svg viewBox="0 0 120 120" width={size} height={size} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} aria-hidden>
      <circle cx="60" cy="60" r="54" fill="var(--accent)" opacity=".15" />
      <motion.circle cx="60" cy="60" r="46" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} />
      <motion.path d="M38 62l15 15 30-32" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }} />
    </motion.svg>
  );
}

/** Party popper burst — "first product listed" / "first sale". */
export function PartyArt() {
  return (
    <motion.svg viewBox="0 0 160 140" className="h-40 w-auto" aria-hidden initial={{ rotate: -12, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}>
      <motion.path d="M30 128 62 44l54 54z" fill="var(--accent)" />
      <path d="M44 92l40 36M52 70l50 46" stroke="#FFF" strokeOpacity=".5" strokeWidth="5" />
      {[
        ["M98 30q10-14 22-6", "#FACC15"],
        ["M110 60q16-4 22 10", "#16A34A"],
        ["M80 20q-2-14 10-18", "#2563EB"],
        ["M124 40q10-8 20 0", "#E11D48"],
      ].map(([d, c], i) => (
        <motion.path key={i} d={d} fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }} />
      ))}
      {[
        [130, 20, "#FACC15"],
        [146, 70, "#E11D48"],
        [92, 8, "#16A34A"],
        [70, 30, "#E8871E"],
      ].map(([x, y, c], i) => (
        <motion.circle key={i} cx={x as number} cy={y as number} r="5" fill={c as string} initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 0.5 + i * 0.1 }} />
      ))}
    </motion.svg>
  );
}

/** Fires confetti + a haptic once when shown. */
export function useCelebrate(active = true) {
  useEffect(() => {
    if (!active) return;
    haptic(30);
    void confetti();
  }, [active]);
}
