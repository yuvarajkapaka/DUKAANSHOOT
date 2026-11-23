"use client";
import { ChevronRight, Coins, Copy, Eye, ImagePlus, Images, Printer, Save, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { ShopLogo } from "@/components/market/shop-logo";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ensureShop } from "@/lib/client/ensure-shop";
import { cropAndCompress, loadImage } from "@/lib/client/image";
import { slugify, type Shop } from "@/lib/market/types";

const input = "min-h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-lg outline-none focus:border-accent";

export default function ShopSettingsPage() {
  const t = useTranslations("shopSettings");
  const tc = useTranslations("common");
  const { market, profile, repo, setProfile } = useAuthed();
  const [shop, setShop] = useState<Shop | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", city: "", whatsapp: "", delivery: "both" as Shop["delivery"] });
  const [logo, setLogo] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void ensureShop(market, profile).then((s) => {
      setShop(s);
      setLogo(s.logo ?? null);
      setForm({ name: s.name, slug: s.slug, city: s.city, whatsapp: s.whatsapp, delivery: s.delivery });
    });
  }, [market, profile]);

  const url = shop && typeof window !== "undefined" ? `${location.origin}/shop/${shop.slug}` : "";
  useEffect(() => {
    if (!url) return;
    void import("qrcode").then((QR) => QR.toDataURL(url, { margin: 1, width: 480, color: { dark: "#1E1B4B", light: "#FFFFFF" } }).then(setQr));
  }, [url]);

  const pickLogo = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const src = URL.createObjectURL(file);
    try {
      const img = await loadImage(src);
      const side = Math.min(img.width, img.height);
      const blob = await cropAndCompress(src, { x: (img.width - side) / 2, y: (img.height - side) / 2, width: side, height: side }, 0, 256);
      setLogo(await market.uploadProductImage(profile.id, blob));
    } finally {
      URL.revokeObjectURL(src);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const slug = slugify(form.slug || form.name);
      if (!(await market.isSlugFree(slug, shop?.id))) {
        toast.error(t("slugTaken"));
        return;
      }
      const s = await market.saveShop(profile.id, { ...form, name: form.name.trim(), slug, whatsapp: form.whatsapp.replace(/\D/g, ""), logo });
      setShop(s);
      setForm((f) => ({ ...f, slug: s.slug }));
      if (profile.shopName !== s.name || profile.city !== s.city) setProfile(await repo.updateProfile({ shopName: s.name, city: s.city }));
      toast.success(t("saved"));
    } catch {
      toast.error(tc("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success(t("copied"));
  };

  return (
    <>
      <AppHeader title={t("title")} side="seller" />
      <main className="mx-auto max-w-6xl px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start lg:gap-6 lg:px-6">
        <div className="lg:sticky lg:top-24">
        {/* share */}
        <section className="rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <h2 className="text-lg">{t("share")}</h2>
          <div className="mt-3 flex items-center gap-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={t("qr")} width={112} height={112} className="size-28 rounded-xl border border-line" />
            ) : (
              <span className="skeleton size-28 rounded-xl" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">{shop?.name}</p>
              <p className="truncate text-sm text-ink-soft">{url.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="whatsapp" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(t("shareText", { shop: shop?.name ?? "", url }))}`, "_blank", "noopener")}>
              <WhatsAppIcon className="size-5" />
              {t("shareWa")}
            </Button>
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy aria-hidden />
              {t("copy")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/seller/shop/print">
                <Printer aria-hidden />
                {t("print")}
              </Link>
            </Button>
            <Button asChild variant="soft" size="sm">
              <Link href={shop ? `/shop/${shop.slug}` : "/market"}>
                <Eye aria-hidden />
                {t("buyerView")}
              </Link>
            </Button>
          </div>
        </section>

        </div>
        <div>
        {/* details */}
        <section className="mt-4 grid gap-3 lg:mt-0 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
          <h2 className="text-lg">{t("details")}</h2>
          <div className="flex items-center gap-3">
            <ShopLogo shop={{ logo, name: form.name }} size={64} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus aria-hidden />
              {t("changeLogo")}
            </Button>
          </div>
          <label className="grid gap-1 font-semibold">
            {t("name")}
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="grid gap-1 font-semibold">
            {t("slug")}
            <span className="flex items-center rounded-xl border-2 border-line bg-paper focus-within:border-accent">
              <span className="pl-3 text-ink-soft">/shop/</span>
              <input className="min-h-12 w-full bg-transparent pr-3 text-lg outline-none" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 font-semibold">
              {t("city")}
              <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label className="grid gap-1 font-semibold">
              {t("whatsapp")}
              <input className={input} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} inputMode="tel" />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("delivery")}</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["delivery", t("deliveryHome")],
                  ["pickup", t("deliveryPickup")],
                  ["both", t("deliveryBoth")],
                ] as const
              ).map(([k, label]) => (
                <Chip key={k} selected={form.delivery === k} onClick={() => setForm({ ...form, delivery: k })}>
                  {label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <Button onClick={save} loading={busy}>
            <Save aria-hidden />
            {t("save")}
          </Button>
        </section>

        {/* more */}
        <nav className="mt-4 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-soft" aria-label={t("more")}>
          {(
            [
              ["/seller/credits", Coins, t("credits")],
              ["/seller/gallery", Images, t("gallery")],
              ["/seller/settings", Settings, t("settings")],
              ["/market", Eye, t("buyerView")],
            ] as const
          ).map(([href, Icon, label]) => (
            <Link key={href} href={href} className="flex min-h-14 items-center gap-3 border-b border-line px-4 font-semibold last:border-0 active:bg-accent-soft">
              <Icon className="size-6 text-accent-strong" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-5 text-ink-soft" aria-hidden />
            </Link>
          ))}
        </nav>
        </div>
      </main>
    </>
  );
}
