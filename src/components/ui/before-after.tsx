"use client";
import { ChevronsLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";

/** Drag the handle to compare the plain item photo with the AI model photo. */
export function BeforeAfter({ before, after, className }: { before: string; after: string; className?: string }) {
  const t = useTranslations("product");
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={box}
      className={cn("relative aspect-[4/5] touch-pan-y overflow-hidden rounded-[var(--radius-card)] bg-paper select-none", className)}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      <SmartImage src={after} alt={t("after")} sizes="480px" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <SmartImage src={before} alt={t("before")} sizes="480px" />
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-night/75 px-3 py-1 text-sm font-semibold text-white">{t("before")}</span>
      <span className="absolute top-3 right-3 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-on-accent">{t("after")}</span>
      <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} aria-hidden />
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={t("compare")}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
      <span
        className="pointer-events-none absolute top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-night shadow-lg"
        style={{ left: `${pos}%` }}
        aria-hidden
      >
        <ChevronsLeftRight className="size-6" />
      </span>
    </div>
  );
}
