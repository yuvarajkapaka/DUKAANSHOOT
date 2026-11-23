import type { Transition, Variants } from "framer-motion";

/** Shared motion language. Durations: micro 150ms · normal 250ms · big 400ms. */
export const DUR = { micro: 0.15, normal: 0.25, big: 0.4 } as const;

export const spring: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const springSoft: Transition = { type: "spring", stiffness: 220, damping: 26 };
export const easeOut: Transition = { duration: DUR.normal, ease: [0.2, 0.8, 0.2, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: spring },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 28 },
  show: { opacity: 1, x: 0, transition: spring },
  exit: { opacity: 0, x: -28, transition: { duration: DUR.micro } },
};

export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const tap = { scale: 0.96 };
