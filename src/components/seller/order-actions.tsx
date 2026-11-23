"use client";
import { Check, Package, PackageCheck, Store, Truck, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { nextStatus, type Order, type OrderStatus } from "@/lib/market/types";

const REASONS = ["stock", "size", "area", "busy"] as const;
const ACTION: Partial<Record<OrderStatus, { key: "accept" | "pack" | "ship" | "ready" | "deliver"; icon: typeof Check }>> = {
  accepted: { key: "accept", icon: Check },
  packed: { key: "pack", icon: Package },
  shipped: { key: "ship", icon: Truck },
  ready: { key: "ready", icon: Store },
  delivered: { key: "deliver", icon: PackageCheck },
};

/** The seller's one-tap status buttons + reject (with reason) + "Notify on WhatsApp". */
export function OrderActions({ order, shopName, compact }: { order: Order; shopName: string; compact?: boolean }) {
  const t = useTranslations("sellerOrders");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const { market, profile } = useAuthed();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("stock");
  const next = nextStatus(order);
  const action = next ? ACTION[next] : undefined;
  const canReject = ["new", "accepted", "packed"].includes(order.status);

  const move = async (status: OrderStatus, why?: string) => {
    setBusy(true);
    try {
      await market.setOrderStatus(profile.id, order.id, status, why);
      toast.success(t("updated"), { description: ts(status) });
    } catch {
      toast.error(tc("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  const notifyWa = () => {
    const text = t("waText", { name: order.buyerName.split(" ")[0], code: order.code, shop: shopName, status: ts(order.status) });
    const phone = order.buyerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.length === 10 ? "91" + phone : phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <>
      <div className={compact ? "mt-3 grid grid-cols-[1fr_auto] gap-2" : "grid gap-2"}>
        {action ? (
          <Button size={compact ? "md" : "lg"} loading={busy} onClick={() => move(next!)} block>
            <action.icon aria-hidden />
            {t(action.key)}
          </Button>
        ) : null}
        <Button variant="whatsapp" size={compact ? "md" : "lg"} onClick={notifyWa} aria-label={t("notifyWa")} className={compact ? "px-3" : ""}>
          <WhatsAppIcon />
          {compact ? null : t("notifyWa")}
        </Button>
        {canReject && !compact ? (
          <Button variant="danger" onClick={() => setRejectOpen(true)}>
            <XCircle aria-hidden />
            {t("reject")}
          </Button>
        ) : null}
      </div>

      <Sheet open={rejectOpen} onOpenChange={setRejectOpen} title={t("rejectTitle")} description={t("rejectReason")}>
        <div className="grid gap-4 pb-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("rejectReason")}>
            {REASONS.map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {t(`reasons.${r}`)}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {tc("no")}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                await move("rejected", t(`reasons.${reason}`));
                setRejectOpen(false);
              }}
            >
              <XCircle aria-hidden />
              {t("reject")}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
