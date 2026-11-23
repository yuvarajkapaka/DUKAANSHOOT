"use client";
import { m as motion } from "framer-motion";
import { ChevronRight, Coins, History, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader, DemoBadge } from "@/components/app-chrome";
import { useAppConfig, useAuthed } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { CreditPack } from "@/lib/types";
import { cn, rupees } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

interface Order {
  mode: "razorpay" | "simulated";
  orderId: string;
  amount: number;
  credits: number;
  keyId?: string;
}

export default function CreditsPage() {
  const t = useTranslations("credits");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const config = useAppConfig();
  const { repo, profile, refreshProfile, setProfile } = useAuthed();
  const [busy, setBusy] = useState<string | null>(null);
  const [sim, setSim] = useState<{ order: Order; pack: CreditPack } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verify = async (order: Order, pack: CreditPack, payload: Record<string, unknown>) => {
    setVerifying(true);
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, ...payload }),
      });
      const body = await res.json();
      const now = new Date().toISOString();
      if (!res.ok || !body.ok) {
        await repo.recordPayment({ id: order.orderId, orderId: order.orderId, amountPaise: pack.pricePaise, credits: pack.credits, status: "failed", createdAt: now });
        toast.error(t("failed"));
        return;
      }
      if (body.wallet === "device") {
        // demo wallet: the server verified the payment, now credit this device
        const credits = await repo.addCredits(body.credits);
        await repo.recordPayment({ id: order.orderId, orderId: order.orderId, paymentId: (payload.paymentId as string) ?? null, amountPaise: pack.pricePaise, credits: body.credits, status: "paid", createdAt: now });
        setProfile({ ...profile, credits });
      } else {
        await refreshProfile();
      }
      toast.success(t("success", { count: body.credits }));
    } catch {
      toast.error(te("network"));
    } finally {
      setVerifying(false);
    }
  };

  const buy = async (pack: CreditPack) => {
    setBusy(pack.id);
    try {
      const res = await fetch("/api/payments/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId: pack.id }) });
      const order = (await res.json()) as Order & { error?: string };
      if (!res.ok) throw new Error(order.error);

      if (order.mode === "simulated") {
        setSim({ order, pack });
        return;
      }
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error("NETWORK");
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: "DukaanShoot",
        description: t("photos", { count: pack.credits }),
        prefill: { contact: profile.phone ?? "", email: profile.email ?? "" },
        theme: { color: "#E8871E" },
        // UPI first — what most shopkeepers use
        config: {
          display: {
            blocks: { upi: { name: "UPI", instruments: [{ method: "upi" }] } },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) =>
          verify(order, pack, { paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
        modal: { ondismiss: () => toast(t("cancelled")) },
      });
      rzp.on("payment.failed", () => toast.error(t("failed")));
      rzp.open();
    } catch (e) {
      toast.error((e as Error).message === "NETWORK" ? te("network") : te("server"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <AppHeader side="seller" back="/seller/shop" />
      <main className="mx-auto max-w-5xl px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {config.demoMode ? <DemoBadge /> : null}
        </div>

        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 rounded-[var(--radius-card)] bg-night p-5 text-white shadow-soft">
          <p className="text-saffron-200">{t("balance")}</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
            <Coins className="size-9 text-saffron-400" aria-hidden />
            {tc("photosLeft", { count: profile.credits })}
          </p>
        </motion.div>

        {config.demoMode ? (
          <p className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-dashed border-saffron-300 bg-saffron-50 px-4 py-3 font-semibold text-saffron-800">
            <ShieldCheck className="size-5 shrink-0" aria-hidden />
            {t("testMode")}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-3 md:gap-4">
          {config.packs.map((pack, i) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn("relative rounded-[var(--radius-card)] border-[3px] bg-paper p-4 shadow-soft", pack.tag === "popular" ? "border-saffron-500" : "border-transparent")}
            >
              {pack.tag ? (
                <span className="absolute -top-3 left-4 rounded-full bg-saffron-500 px-3 py-0.5 text-sm font-bold text-ink">{pack.tag === "popular" ? t("popular") : t("best")}</span>
              ) : null}
              <div className="grid gap-3">
                <div className="flex items-baseline justify-between gap-2 pt-1">
                  <p className="text-2xl font-extrabold whitespace-nowrap">{t("photos", { count: pack.credits })}</p>
                  <p className="text-[15px] text-ink-soft">{t("perPhoto", { price: (pack.pricePaise / 100 / pack.credits).toFixed(2) })}</p>
                </div>
                <Button block onClick={() => buy(pack)} loading={busy === pack.id} disabled={!!busy || verifying}>
                  <Smartphone aria-hidden />
                  {t("buy", { price: (pack.pricePaise / 100).toLocaleString("en-IN") })}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-center text-[15px] text-ink-soft">{t("upiFirst")}</p>

        <Link href="/seller/credits/history" className="mt-5 flex min-h-14 items-center gap-3 rounded-[var(--radius-card)] bg-paper px-4 font-semibold shadow-soft">
          <History className="size-6 text-saffron-700" aria-hidden />
          <span className="flex-1">{t("history")}</span>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </main>

      {/* simulated checkout when no Razorpay test keys are configured */}
      <Sheet open={!!sim} onOpenChange={(o) => !o && setSim(null)} title={t("simTitle")} description={t("simBody")}>
        {sim ? (
          <div className="grid gap-3 pb-4">
            <div className="flex items-center justify-between rounded-2xl bg-paper p-4 shadow-soft">
              <span className="text-lg font-semibold">{t("photos", { count: sim.pack.credits })}</span>
              <span className="text-xl font-extrabold">{rupees(sim.pack.pricePaise)}</span>
            </div>
            <Button
              size="lg"
              loading={verifying}
              onClick={async () => {
                await verify(sim.order, sim.pack, { paymentId: "sim_pay_" + Date.now() });
                setSim(null);
              }}
            >
              <Smartphone aria-hidden />
              {t("simPay", { price: (sim.pack.pricePaise / 100).toLocaleString("en-IN") })}
            </Button>
            <Button
              variant="danger"
              disabled={verifying}
              onClick={async () => {
                await verify(sim.order, sim.pack, { simulateFailure: true });
                setSim(null);
              }}
            >
              <XCircle aria-hidden />
              {t("simFail")}
            </Button>
            <p className="flex items-center justify-center gap-2 text-sm text-ink-soft">
              <DemoBadge /> {t("testMode")}
            </p>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
