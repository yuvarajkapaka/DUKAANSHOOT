"use client";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { haptic } from "@/lib/client/effects";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui-style button tuned for shopkeepers: min 48px tall, icon + label.
 * Rangoli Grid: 2px ink outline + hard offset shadow; press = the button sinks into
 * its shadow, plus a ripple and a 10ms haptic tick on Android.
 */
const buttonVariants = cva(
  "relative isolate inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-btn)] border-2 border-ink font-bold tracking-[-0.01em] transition-[transform,background-color,box-shadow,opacity] duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent shadow-lift hover:-translate-y-0.5",
        marigold: "bg-saffron-500 text-night shadow-lift hover:-translate-y-0.5",
        dark: "bg-night text-white shadow-lift hover:-translate-y-0.5 dark:bg-paper dark:text-ink",
        outline: "bg-paper text-ink hover:bg-saffron-50",
        ghost: "border-transparent text-ink hover:bg-accent-soft active:bg-accent-soft",
        soft: "bg-accent-soft text-accent-strong hover:brightness-95",
        danger: "border-danger bg-paper text-danger hover:bg-red-50 dark:hover:bg-red-950",
        whatsapp: "bg-[#0E7A40] text-white shadow-lift hover:-translate-y-0.5",
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
