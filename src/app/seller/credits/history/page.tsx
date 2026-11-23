"use client";
import { ArrowDownLeft, ArrowUpRight, Receipt, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { useAuthed } from "@/components/providers";
import { cn, rupees } from "@/lib/utils";

interface Row {
  id: string;
  at: string;
  title: string;
  sub: string;
  delta: number;
  kind: "buy" | "use" | "refund" | "failed";
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const tg = useTranslations("garment");
  const tr = useTranslations("results");
  const locale = useLocale();
  const { repo } = useAuthed();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const [payments, gens] = await Promise.all([repo.listPayments(), repo.listGenerations()]);
      const out: Row[] = payments.map((p) => ({
        id: p.id,
        at: p.createdAt,
        title: t("purchase", { count: p.credits }),
        sub: `${rupees(p.amountPaise)} · ${t(`status_${p.status}`)}`,
        delta: p.status === "paid" ? p.credits : 0,
        kind: p.status === "paid" ? "buy" : "failed",
      }));
      for (const g of gens) {
        if (!g.creditsUsed) continue;
        out.push({ id: g.id + ":u", at: g.createdAt, title: `📷 ${tg(g.garmentType)}`, sub: "", delta: -g.creditsUsed, kind: "use" });
        if (g.status === "failed") out.push({ id: g.id + ":r", at: g.createdAt, title: tr("refunded", { count: g.creditsUsed }), sub: "", delta: g.creditsUsed, kind: "refund" });
      }
      setRows(out.sort((a, b) => b.at.localeCompare(a.at)));
    })().catch(() => setRows([]));
  }, [repo, t, tg, tr]);

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-IN" : `${locale}-IN`, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <AppHeader side="seller" back="/seller/credits" />
      <main className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {rows === null ? (
          <div className="mt-4 grid gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : !rows.length ? (
          <p className="mt-10 flex flex-col items-center gap-3 text-lg text-ink-soft">
            <Receipt className="size-10" aria-hidden />
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft">
            {rows.map((r) => {
              const Icon = r.kind === "buy" ? ArrowDownLeft : r.kind === "refund" ? RotateCcw : r.kind === "use" ? ArrowUpRight : Receipt;
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", r.delta > 0 ? "bg-green-50 text-leaf" : r.kind === "failed" ? "bg-red-50 text-danger" : "bg-saffron-50 text-saffron-700")}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.title}</span>
                    <span className="block text-[14px] text-ink-soft">
                      {fmt.format(new Date(r.at))}
                      {r.sub ? ` · ${r.sub}` : ""}
                    </span>
                  </span>
                  {r.delta ? <span className={cn("text-lg font-bold", r.delta > 0 ? "text-leaf" : "text-ink")}>{r.delta > 0 ? `+${r.delta}` : r.delta}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
