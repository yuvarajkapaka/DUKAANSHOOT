"use client";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { haptic } from "@/lib/client/effects";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style button tuned for shopkeepers: min 48px tall, icon + label.
 *
 * Atelier finish: a 1px hairline instead of two black pixels, a top inner
 * highlight so the face reads as a lit surface, and a layered lift that the
 * button sinks into when pressed — plus a ripple and a 10ms haptic on Android.
 */
const buttonVariants = cva(
  "relative isolate inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-btn)] font-semibold tracking-[-0.005em] transition-[transform,background,box-shadow,opacity] duration-200 active:translate-y-[1px] active:shadow-[0_1px_2px_rgb(21_18_46/0.2)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--accent)_88%,white),var(--accent))] text-on-accent shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-dark)_70%,transparent),inset_0_1px_0_rgb(255_255_255/0.35),var(--shadow-lift)] hover:-translate-y-0.5 hover:brightness-[1.04]",
        marigold:
          "bg-[linear-gradient(180deg,#f3a74a,#e8871e)] text-[#2a1a05] shadow-[0_0_0_1px_rgb(176_98_14/0.7),inset_0_1px_0_rgb(255_255_255/0.4),var(--shadow-lift)] hover:-translate-y-0.5",
        foil:
          "sheen bg-foil text-on-gold shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold-deep)_55%,transparent),inset_0_1px_0_rgb(255_255_255/0.6),var(--shadow-lift)] hover:-translate-y-0.5",
        dark: "panel-night text-ivory shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_35%,transparent),var(--shadow-lift)] hover:-translate-y-0.5 dark:bg-paper dark:text-ink",
        outline: "edge bg-paper text-ink shadow-soft hover:-translate-y-0.5 hover:bg-cream-deep",
        ghost: "text-ink hover:bg-accent-soft active:bg-accent-soft",
        soft: "edge-gold bg-accent-soft text-accent-strong hover:brightness-[0.97]",
        danger: "bg-paper text-danger shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-danger)_45%,transparent),var(--shadow-e1)] hover:bg-red-50 dark:hover:bg-red-950",
        whatsapp:
          "bg-[linear-gradient(180deg,#139a53,#0b6334)] text-white shadow-[0_0_0_1px_rgb(8_70_37/0.8),inset_0_1px_0_rgb(255_255_255/0.25),var(--shadow-lift)] hover:-translate-y-0.5",
      },
      size: {
        md: "min-h-12 px-5 text-base",
        lg: "min-h-14 px-6 text-lg",
        xl: "min-h-[72px] px-6 text-xl",
        sm: "min-h-12 px-3.5 text-[15px] [&_svg]:size-5",
        icon: "size-12",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function addRipple(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) / 2;
  const span = document.createElement("span");
  span.className = "ripple";
  Object.assign(span.style, { width: `${size}px`, height: `${size}px`, left: `${e.clientX - r.left - size / 2}px`, top: `${e.clientY - r.top - size / 2}px` });
  el.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild, loading, children, disabled, onPointerDown, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
          addRipple(e);
          haptic();
          onPointerDown?.(e);
        }}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
