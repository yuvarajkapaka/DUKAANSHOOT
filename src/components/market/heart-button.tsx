"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { haptic } from "@/lib/client/effects";
import { cn } from "@/lib/utils";
import { useMarketState } from "../market-state";

const PARTICLES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

/** Wishlist heart: pops, bursts small particles and turns rose red. */
export function HeartButton({ productId, className, size = "md" }: { productId: string; className?: string; size?: "md" | "lg" }) {
  const t = useTranslations("market");
  const { wishlist, toggleWishlist } = useMarketState();
  const on = wishlist.has(productId);
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? t("unsave") : t("save")}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        haptic(12);
        const r = await toggleWishlist(productId);
        if (r) setBurst((b) => b + 1);
      }}
      className={cn(
        "relative flex items-center justify-center rounded-2xl border-2 border-[#1E1B4B] transition-[transform,background-color] active:scale-90",
        on ? "bg-[#E11D48]" : "bg-white",
        size === "lg" ? "size-14" : "size-12",
        className,
      )}
    >
      <motion.span key={`h${burst}`} initial={burst ? { scale: 0.4 } : false} animate={{ scale: [0.4, 1.3, 1] }} transition={{ duration: 0.35 }}>
        <Heart className={cn(size === "lg" ? "size-7" : "size-6", on ? "fill-white text-white" : "text-[#1E1B4B]")} aria-hidden />
      </motion.span>
      <AnimatePresence>
        {burst ? (
          <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden>
            {PARTICLES.map((a, i) => (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
                style={{ background: i % 2 ? "#E11D48" : "#FB923C" }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(a) * 26, y: Math.sin(a) * 26, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
