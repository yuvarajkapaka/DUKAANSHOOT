"use client";
import { m } from "framer-motion";
import { drawX, enter, inView, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The graphic-design kit for "Rangoli Grid · Atelier".
 *
 * Every ornament is inline SVG or CSS — no image requests, no layout cost — and
 * each one is drawn with `currentColor` so it inherits the surface it sits on and
 * works in both themes. Decoration is always `aria-hidden`.
 */

/** Film-grain / handmade-paper tooth over a coloured surface. Parent needs `relative`. */
export function Grain({ className }: { className?: string }) {
  return <span aria-hidden className={cn("grain-layer", className)} />;
}

/** Jaali — the pierced lattice of a haveli screen. Sits behind hero content. */
export function Jaali({ className }: { className?: string }) {
  return <span aria-hidden className={cn("bg-jaali pointer-events-none absolute inset-0", className)} />;
}

/** Kolam — the rangoli dot grid drawn on a doorstep each morning. */
export function Kolam({ className }: { className?: string }) {
  return <span aria-hidden className={cn("bg-kolam pointer-events-none absolute inset-0", className)} />;
}

/** Handloom weave texture: warp and weft at 6px. */
export function Weave({ className }: { className?: string }) {
  return <span aria-hidden className={cn("bg-weave pointer-events-none absolute inset-0", className)} />;
}

/**
 * The rangoli mandala: 8 petals, a seed ring and an outer dotted halo.
 * Turns very slowly (42s) when given `spin-slow`, so it reads as a watermark.
 */
export function RangoliMotif({ className, strokeWidth = 1.1, size }: { className?: string; strokeWidth?: number; size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className} aria-hidden>
      <circle cx="60" cy="60" r="8" />
      <circle cx="60" cy="60" r="15.5" strokeDasharray="2 5" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 45} 60 60)`}>
          {/* petal */}
          <path d="M60 44c7 6 11 11 11 17s-4 11-11 15c-7-4-11-9-11-15s4-11 11-17z" />
          {/* spoke + tip dot */}
          <path d="M60 38V22" strokeDasharray="3 4" />
          <circle cx="60" cy="18" r="1.8" fill="currentColor" stroke="none" />
        </g>
      ))}
      <circle cx="60" cy="60" r="40" strokeDasharray="1 7" />
      <circle cx="60" cy="60" r="52" strokeDasharray="14 10" opacity="0.6" />
    </svg>
  );
}

/** A paisley (boteh) — the mango motif of a Kanjivaram border. Good in panel corners. */
export function Paisley({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" className={className} aria-hidden>
      <path d="M70 12c16 10 22 30 14 48-8 17-27 27-44 22-13-4-21-16-19-29 2-12 12-20 23-19 9 1 15 8 14 16-1 7-7 12-13 11-5-1-8-5-7-9" />
      <path d="M66 24c10 8 13 22 8 34-6 12-19 19-30 16" strokeDasharray="3 5" />
      <circle cx="56" cy="52" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A six-pointed "zari" star — small sparkle for empty corners and badges. */
export function Zari({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 0c.6 6.4 3.6 9.4 10 10-6.4.6-9.4 3.6-10 10-.6-6.4-3.6-9.4-10-10 6.4-.6 9.4-3.6 10-10z" fill="currentColor" />
    </svg>
  );
}

/**
 * Temple border — the triangular "kumbam" edging woven into a silk saree.
 * Use as a top or bottom trim on panels: `<TempleBorder className="text-gold" />`.
 */
export function TempleBorder({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 8" preserveAspectRatio="none" className={cn("h-2 w-full", flip && "rotate-180", className)} aria-hidden>
      <defs>
        <pattern id="temple" width="10" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 5 1l5 7z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="120" height="8" fill="url(#temple)" />
    </svg>
  );
}

/** A gold rule that fades out at both ends, with an optional diamond in the middle. */
export function GoldRule({ className, diamond = true, style }: { className?: string; diamond?: boolean; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={cn("flex items-center gap-3", className)} style={style}>
      <span className="rule-gold flex-1" />
      {diamond ? <Zari className="size-3 shrink-0 text-gold" /> : null}
      <span className="rule-gold flex-1" />
    </span>
  );
}

/**
 * Section heading with an eyebrow label and a gold rule — the editorial rhythm
 * that makes a long page feel composed rather than listed.
 */
export function SectionHead({
  eyebrow,
  title,
  action,
  id,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  // eyebrow → title → action arrive in turn, then the gold rule draws itself across
  return (
    <m.div {...inView} variants={stagger(0.07)} className={cn("mb-4", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <m.p variants={enter} className="eyebrow">
              <Zari className="size-2.5" />
              {eyebrow}
            </m.p>
          ) : null}
          <m.h2 variants={enter} id={id} className="font-display text-2xl leading-tight md:text-[1.75rem]">
            {title}
          </m.h2>
        </div>
        {action ? (
          <m.div variants={enter} className="shrink-0 pb-1">
            {action}
          </m.div>
        ) : null}
      </div>
      <m.span aria-hidden variants={drawX} className="rule-gold mt-2.5 block origin-left" />
    </m.div>
  );
}

/** The small-caps label above a heading: gold, tracked out, led by a zari star. */
export function Eyebrow({ children, className, tone = "gold" }: { children: React.ReactNode; className?: string; tone?: "gold" | "light" }) {
  return (
    <p className={cn("eyebrow", tone === "light" && "text-gold-light/90", className)}>
      <Zari className="size-2.5" />
      {children}
    </p>
  );
}

/** Soft aurora mesh + grain, the standard backdrop for brand surfaces. */
export function MeshBackdrop({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <span className="bg-mesh absolute inset-[-30%] opacity-70 blur-[60px]" />
      <span className="grain-layer" />
    </span>
  );
}
