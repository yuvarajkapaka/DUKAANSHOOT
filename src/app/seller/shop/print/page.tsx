"use client";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-chrome";
import { useMarketQuery } from "@/components/market-state";
import { ShopLogo } from "@/components/market/shop-logo";
import { useAuthed } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { ensureShop } from "@/lib/client/ensure-shop";

/** A4-friendly poster for the shop counter. */
export default function PrintQrPage() {
  const t = useTranslations("shopSettings");
  const { market, profile } = useAuthed();
  const shop = useMarketQuery(() => ensureShop(market, profile), [market, profile.id], []);
  const [qr, setQr] = useState("");
  const url = shop.data ? `${location.origin}/shop/${shop.data.slug}` : "";
  useEffect(() => {
    if (!url) return;
    void import("qrcode").then((QR) => QR.toDataURL(url, { margin: 1, width: 900, color: { dark: "#1E1B4B", light: "#FFFFFF" } }).then(setQr));
  }, [url]);

  return (
    <>
      <div className="no-print">
        <AppHeader back="/seller/shop" side="seller" />
      </div>
      <main className="mx-auto max-w-[480px] px-4 print:max-w-none">
        <div className="no-print mb-4">
          <Button block size="lg" onClick={() => window.print()} disabled={!qr}>
            <Printer aria-hidden />
            {t("print")}
          </Button>
        </div>
        <article className="flex flex-col items-center rounded-[var(--radius-card)] border-4 border-saffron-500 bg-white p-8 text-center text-night print:rounded-none print:border-8">
          {shop.data ? <ShopLogo shop={shop.data} size={96} /> : null}
          <h1 className="mt-4 font-display text-4xl">{shop.data?.name}</h1>
          <p className="mt-1 text-lg">{shop.data?.city}</p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={t("qr")} className="mt-6 w-full max-w-xs" />
          ) : (
            <div className="skeleton mt-6 aspect-square w-full max-w-xs rounded-xl" />
          )}
          <p className="mt-6 font-display text-2xl">{t("scan")}</p>
          <p className="mt-2 break-all text-sm">{url.replace(/^https?:\/\//, "")}</p>
          <p className="mt-6 text-sm text-[#6B7280]">DukaanShoot</p>
        </article>
      </main>
    </>
  );
}
