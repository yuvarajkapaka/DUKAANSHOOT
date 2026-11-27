"use client";
import { m, type Variants } from "framer-motion";
import { enter, inView, rise, stagger } from "@/lib/motion";

/**
 * Scroll reveals built on the shared motion library.
 *
 * Above-the-fold content keeps its CSS entrance (.anim-rise) so it paints before
 * JS loads. Everything further down uses these, so a section comes into focus
 * when the shopper actually reaches it, not while it is still off-screen.
 * Reduced motion: <MotionConfig reducedMotion="user"> drops the movement and
 * keeps a plain fade.
 */

type Tag = "div" | "section" | "ul" | "ol" | "li" | "nav" | "article" | "p" | "span";

const VARIANTS = { enter, rise } satisfies Record<string, Variants>;

export function Reveal({
  as = "div",
  variant = "enter",
  delay = 0,
  className,
  style,
  children,
  ...rest
}: {
  as?: Tag;
  variant?: keyof typeof VARIANTS;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "style" | "className" | "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp {...inView} variants={VARIANTS[variant]} custom={delay} className={className} style={style} {...rest}>
      {children}
    </Comp>
  );
}

/** A container whose <RevealItem> children arrive one after another once it scrolls in. */
export function RevealGroup({
  as = "div",
  step = 0.06,
  delay = 0,
  className,
  style,
  children,
  ...rest
}: {
  as?: Tag;
  step?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "style" | "className" | "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp {...inView} variants={stagger(step, delay)} className={className} style={style} {...rest}>
      {children}
    </Comp>
  );
}

export function RevealItem({
  as = "div",
  variant = "rise",
  className,
  style,
  children,
  ...rest
}: {
  as?: Tag;
  variant?: keyof typeof VARIANTS;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "style" | "className" | "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp variants={VARIANTS[variant]} className={className} style={style} {...rest}>
      {children}
    </Comp>
  );
}
