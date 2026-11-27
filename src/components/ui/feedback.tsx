"use client";
import { animate, m as motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";
import { Button } from "./button";

/** Friendly illustration: a hanger with a sparkle. */
function HangerArt({ mood = "happy" }: { mood?: "happy" | "sad" }) {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <ellipse cx="80" cy="108" rx="56" ry="7" fill="var(--accent-soft)" />
      <path d="M80 22c0-8 12-8 12 0 0 6-12 8-12 16" fill="none" stroke="var(--muted)" strokeWidth="4" strokeLinecap="round" />
      <path d="M80 38 30 70c-6 4-3 10 4 10h92c7 0 10-6 4-10L80 38z" fill="none" stroke="var(--fg)" strokeWidth="5" strokeLinejoin="round" />
      <path d="M44 80h72l-8 22H52z" fill="var(--accent)" opacity=".9" />
      <circle cx="68" cy="90" r="2.5" fill="var(--card)" />
      <circle cx="92" cy="90" r="2.5" fill="var(--card)" />
      {mood === "happy" ? (
        <path d="M72 96q8 6 16 0" stroke="var(--card)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M72 99q8-6 16 0" stroke="var(--card)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      <path d="M128 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#FACC15" />
      <path d="M24 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--accent)" />
    </svg>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("anim-rise flex flex-col items-center gap-2 rounded-[var(--radius-card)] px-6 py-10 text-center", className)}>
      <HangerArt />
      <p className="font-display text-xl">{title}</p>
      {body ? <p className="max-w-xs text-ink-soft">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const t = useTranslations("common");
  return (
    <div className={cn("anim-rise flex flex-col items-center gap-2 px-6 py-10 text-center", className)}>
      <HangerArt mood="sad" />
      <p className="font-display text-xl">{t("somethingWrong")}</p>
      <Button className="mt-3" onClick={onRetry}>
        <RefreshCw aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}

/** Number that counts up when it scrolls into view. */
export function Counter({ value, className, format = (n: number) => n.toLocaleString("en-IN") }: { value: number; className?: string; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.1, ease: EASE.out });
    return () => c.stop();
  }, [inView, value, mv]);
  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

/** Pull down at the top of a list to refresh (touch only). */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown> | void; children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const THRESHOLD = 70;
  return (
    <div
      onTouchStart={(e) => {
        start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
      }}
      onTouchMove={(e) => {
        if (start.current === null || busy) return;
        const d = e.touches[0].clientY - start.current;
        setPull(d > 0 ? Math.min(110, d * 0.5) : 0);
      }}
      onTouchEnd={async () => {
        if (pull >= THRESHOLD && !busy) {
          setBusy(true);
          setPull(56);
          await onRefresh();
          setBusy(false);
        }
        setPull(0);
        start.current = null;
      }}
    >
      <div className="pointer-events-none flex h-0 justify-center overflow-visible" aria-hidden>
        <span
          className="mt-2 flex size-10 items-center justify-center rounded-full bg-paper shadow-soft transition-opacity"
          style={{ transform: `translateY(${pull - 20}px) rotate(${pull * 4}deg)`, opacity: pull ? Math.min(1, pull / THRESHOLD) : 0 }}
        >
          <RefreshCw className={cn("size-5 text-accent-strong", busy && "animate-spin")} />
        </span>
      </div>
      <div style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: start.current === null ? "transform var(--dur-normal) var(--ease-out)" : undefined }}>{children}</div>
    </div>
  );
}
