"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { Check } from "lucide-react";
import { haptic } from "@/lib/client/effects";
import { cn } from "@/lib/utils";

/** Big, round choice chip (Rangoli Grid). Selected = filled with ink + a checkmark pops in. */
export function Chip({
  selected,
  onClick,
  children,
  className,
  swatch,
  role = "radio",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  swatch?: string;
  role?: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={() => {
        haptic(8);
        onClick();
      }}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink px-4 text-[15px] font-bold transition-[transform,background-color,color] duration-150 active:scale-95",
        selected ? "bg-ink text-cream" : "bg-paper text-ink hover:bg-saffron-50",
        className,
      )}
    >
      {swatch ? <span className="size-6 rounded-full border-2 border-white/70 shadow-sm" style={{ background: swatch }} aria-hidden /> : null}
      <AnimatePresence initial={false}>
        {selected && !swatch ? (
          <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
            <Check className="size-5" strokeWidth={3} aria-hidden />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {children}
    </button>
  );
}

export function ChipGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2.5", className)}>
      {children}
    </div>
  );
}
