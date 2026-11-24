"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { Check } from "lucide-react";
import { haptic } from "@/lib/client/effects";
import { cn } from "@/lib/utils";

/** Big, round choice chip. Selected = an indigo night face with a brass hairline + a checkmark pops in. */
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
        "inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-[transform,background-color,color,box-shadow] duration-200 active:scale-95",
        selected
          ? "panel-night text-[#fdf7ee] shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_45%,transparent),0_8px_18px_-8px_rgb(21_18_46/0.5)]"
          : "edge bg-paper text-ink shadow-soft hover:-translate-y-0.5 hover:bg-cream-deep",
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
