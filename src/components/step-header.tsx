"use client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function StepHeader({ step, title }: { step: 1 | 2 | 3; title: string }) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="flex items-center gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-2 flex-1 rounded-full transition-colors", n <= step ? "bg-saffron-500" : "bg-line")} />
        ))}
      </div>
      <p className="mt-2 text-[15px] font-semibold text-saffron-700">{t("step", { n: step })}</p>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}
