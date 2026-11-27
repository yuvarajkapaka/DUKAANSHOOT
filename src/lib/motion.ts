import type { Transition, Variants } from "framer-motion";

/**
 * DukaanShoot motion language — "Rangoli Grid · Atelier".
 *
 * One source of truth for how things move. Every framer-motion component
 * imports from here, and the CSS twins (--ease-*, --dur-*) in globals.css
 * carry the same curves, so CSS keyframes and JS springs feel like one hand.
 *
 * Weighting: production polish first (soft springs, no overshoot, blur-to-focus
 * entrances, exits quieter than entrances), restraint for anything tapped many
 * times a day (tabs, chips, steppers: fast or instant), and real bounce kept
 * only for rare moments of joy (order placed, photos ready, first sale).
 */

type Bezier = [number, number, number, number];

/** seconds — small things move fast, big surfaces take longer */
export const DUR = { micro: 0.15, fast: 0.2, normal: 0.3, big: 0.45, slow: 0.6 } as const;

export const EASE: { out: Bezier; inOut: Bezier; in: Bezier } = {
  /** arriving: quick start, long soft landing */
  out: [0.22, 1, 0.36, 1],
  /** changing state while visible */
  inOut: [0.65, 0, 0.35, 1],
  /** leaving: gentle start, gone quickly */
  in: [0.55, 0, 1, 0.45],
};

export const spring = {
  /** UI default — sheets, drawers, carousels, sliding pills. Settles fast, never overshoots. */
  snappy: { type: "spring", duration: 0.4, bounce: 0 },
  /** larger surfaces and content entrances */
  soft: { type: "spring", duration: 0.55, bounce: 0 },
  /** a hint of life for small confirmations: checks, badges, counters */
  pop: { type: "spring", duration: 0.45, bounce: 0.28 },
  /** celebrations only — order placed, photos ready, first sale */
  joy: { type: "spring", duration: 0.7, bounce: 0.42 },
} satisfies Record<string, Transition>;

export const ease = {
  out: { duration: DUR.normal, ease: EASE.out },
  inOut: { duration: DUR.normal, ease: EASE.inOut },
  exit: { duration: DUR.fast, ease: EASE.in },
} satisfies Record<string, Transition>;

/* ------------------------------------------------------------------ variants
   Every variant set uses the names hidden / show / exit, so they compose with
   `stagger()` parents and AnimatePresence without per-call wiring.

   A delay goes in through `custom` (e.g. <m.div variants={rise} custom={0.12}>):
   a transition written inside a variant overrides the component's `transition`
   prop, and an explicit `delay: 0` would cancel a parent's stagger — so the key
   is only added when there is a real delay. */

const after = (t: Transition, delay?: number): Transition => (delay ? { ...t, delay } : t);

/** Text and small blocks: rise + come into focus (opacity · translateY · blur). */
export const enter: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  show: (delay?: number) => ({ opacity: 1, y: 0, filter: "blur(0px)", transition: after(spring.soft, delay) }),
  exit: { opacity: 0, y: -6, filter: "blur(2px)", transition: ease.exit },
};

/** Image-heavy cards: same rise, no blur (blurring photos is costly on cheap phones). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay?: number) => ({ opacity: 1, y: 0, transition: after(spring.soft, delay) }),
  exit: { opacity: 0, y: -8, transition: ease.exit },
};

/** Badges, stamps, small surfaces arriving. Never from scale(0). */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: (delay?: number) => ({ opacity: 1, scale: 1, transition: after(spring.pop, delay) }),
  exit: { opacity: 0, scale: 0.94, transition: { duration: DUR.micro, ease: EASE.in } },
};

/** Centered dialogs and overlays that grow out of the page. */
export const dialog: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: spring.snappy },
  exit: { opacity: 0, scale: 0.98, y: 6, filter: "blur(2px)", transition: ease.exit },
};

/** Scrims behind sheets and dialogs. */
export const scrim: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.normal, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE.in } },
};

/** Direction-aware slide for steppers and carousels: pass `custom={1}` forward, `-1` back. */
export const slide: Variants = {
  hidden: (dir: number = 1) => ({ opacity: 0, x: 36 * dir, filter: "blur(4px)" }),
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: spring.soft },
  exit: (dir: number = 1) => ({ opacity: 0, x: -20 * dir, filter: "blur(2px)", transition: ease.exit }),
};

/** A parent that reveals its children one after another. */
export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** A hairline rule drawing itself across from the left. */
export const drawX: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: DUR.slow, ease: EASE.out, delay: 0.1 } },
};

/* ------------------------------------------------------------------ props
   Spread these straight onto an `m.*` element. */

/**
 * Reveal once, when 15% of the element is on screen. (A visibility threshold rather
 * than a shrunken viewport margin: with a margin, something resting near the bottom
 * of a page that cannot scroll any further would never trigger and stay invisible.)
 */
export const inView = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.15 },
} as const;

/** Contextual icon swaps (wand → check, play → pause): scale + blur cross-fade. */
export const iconSwap = {
  initial: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.6, filter: "blur(4px)" },
  transition: { duration: DUR.fast, ease: EASE.out },
} as const;

/** A number that just changed (credits, quantity, stock): the new value drops in. */
export const valueRoll = {
  initial: { opacity: 0, y: -8, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: spring.snappy,
} as const;

/** Height-auto expand for disclosure panels. */
export const expand = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { height: spring.snappy, opacity: { duration: DUR.normal, delay: 0.05 } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: DUR.fast, ease: EASE.in }, opacity: { duration: DUR.micro } } },
} as const;

/** Press feedback for tappable surfaces. */
export const tap = { scale: 0.97 } as const;

/** Column-aware delay so each row of a grid reveals left-to-right as it scrolls in. */
export const gridDelay = (index: number, cols = 4, step = 0.06) => (index % cols) * step;
