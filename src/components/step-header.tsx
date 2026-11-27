"use client";
import { useTranslations } from "next-intl";
import { Zari } from "@/components/brand/ornaments";
import { cn } from "@/lib/utils";

export function StepHeader({ step, title }: { step: 1 | 2 | 3; title: string }) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="flex items-center gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", n <= step ? "bg-[linear-gradient(90deg,var(--gold-light),var(--gold))] shadow-[0_0_12px_-2px_color-mix(in_oklab,var(--gold)_70%,transparent)]" : "bg-line")} />
        ))}
      </div>
      <p className="eyebrow mt-3">
        <Zari className="size-2.5" />
        {t("step", { n: step })}
      </p>
      <h1 className="mt-0.5 font-display text-[1.6rem] leading-tight md:text-[1.9rem]">{title}</h1>
    </div>
  );
}
