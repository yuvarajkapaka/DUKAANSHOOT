"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { enter, pop, valueRoll } from "@/lib/motion";
import { Check, EyeOff, ImagePlus, Minus, PackageX, Plus, RotateCcw, Rocket, Save, Share2, Store, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthed } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { PartyArt, useCelebrate } from "@/components/ui/celebration";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { SmartImage } from "@/components/ui/smart-image";
import { sampleInputUrl } from "@/lib/art/samples";
import { ensureShop } from "@/lib/client/ensure-shop";
import { CATEGORIES, categoryForGarment, SIZE_PRESETS, type Category, type Product, type Shop } from "@/lib/market/types";
import type { Generation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Candidate {
  key: string;
  url: string; // what we can show now
  ref?: string; // already a stored product image
  genId?: string;
  imageId?: string;
}

const input = "min-h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-lg outline-none focus:border-accent";

function FirstProduct({ shop, productId }: { shop: Shop; productId: string }) {
  const t = useTranslations("products");
  const ts = useTranslations("shopSettings");
  useCelebrate();
  const share = async () => {
    const url = `${location.origin}/shop/${shop.slug}`;
    const text = ts("shareText", { shop: shop.name, url });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream px-6 text-center" role="dialog" aria-modal="true" aria-label={t("firstTitle")}>
      <PartyArt />
      <motion.h1 variants={enter} initial="hidden" animate="show" custom={0.4} className="mt-4 font-display text-3xl">
        {t("firstTitle")}
      </motion.h1>
      <motion.p variants={enter} initial="hidden" animate="show" custom={0.52} className="mt-2 max-w-xs text-lg text-ink-soft">
        {t("firstBody")}
      </motion.p>
      <div className="mt-8 grid w-full max-w-sm gap-3">
        <Button variant="whatsapp" size="lg" onClick={share}>
          <Share2 aria-hidden />
          {t("shareShop")}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/product/${productId}`}>
            <Store aria-hidden />
            {t("view")}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/seller/products">{t("title")}</Link>
        </Button>
      </div>
    </div>
  );
}

export function ProductForm({ generationId, product }: { generationId?: string; product?: Product }) {
  const t = useTranslations("products");
  const tc = useTranslations("categories");
  const tg = useTranslations("garment");
  const tcm = useTranslations("common");
  const router = useRouter();
  const { repo, market, profile } = useAuthed();
  const editing = !!product;

  const [gen, setGen] = useState<Generation | null>(null);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState(product?.title ?? "");
  const [price, setPrice] = useState(product ? String(product.pricePaise / 100) : "");
  const [mrp, setMrp] = useState(product?.mrpPaise ? String(product.mrpPaise / 100) : "");
  const [category, setCategory] = useState<Category>(product?.category ?? "sarees");
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? ["Free size"]);
  const [stock, setStock] = useState(product?.stock ?? 5);
  const [desc, setDesc] = useState(product?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [allGens, setAllGens] = useState<Generation[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [first, setFirst] = useState<{ shop: Shop; productId: string } | null>(null);

  // prefill from the photo session
  useEffect(() => {
    if (product) {
      const c = product.images.map((ref, i) => ({ key: `p${i}`, url: ref, ref }));
      setCands(c);
      setPicked(c.map((x) => x.key));
      return;
    }
    if (!generationId) return;
    void repo.getGeneration(generationId).then((g) => {
      if (!g) return;
      setGen(g);
      const c = g.images.map((im) => ({ key: im.id, url: im.url, genId: g.id, imageId: im.id }));
      setCands(c);
      setPicked(c.map((x) => x.key));
      const kid = g.look.gender === "girl" || g.look.gender === "boy";
      const cat = categoryForGarment(g.garmentType, kid);
      setCategory(cat);
      setSizes(SIZE_PRESETS[cat].length === 1 ? SIZE_PRESETS[cat] : SIZE_PRESETS[cat].slice(0, 4));
      setTitle(tg(g.garmentType));
    });
  }, [generationId, product, repo, tg]);

  const openGallery = async () => {
    setGalleryOpen(true);
    setAllGens((await repo.listGenerations()).filter((g) => g.images.length));
  };

  const togglePick = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const persist = async (c: Candidate) => {
    if (c.ref) return c.ref;
    if (c.url.startsWith("/")) return c.url; // pre-made sample photo
    const blob = c.genId && c.imageId ? await repo.getImageBlob(c.genId, c.imageId) : null;
    if (!blob) throw new Error("IMAGE");
    return market.uploadProductImage(profile.id, blob);
  };

  const beforeRef = async () => {
    if (!gen) return product?.beforeImage ?? null;
    if (gen.source.kind === "sample") return sampleInputUrl(gen.source.sampleId);
    const blob = await repo.getUploadBlob(gen.source.uploadId);
    return blob ? market.uploadProductImage(profile.id, blob) : null;
  };

  const save = async () => {
    const pricePaise = Math.round(Number(price) * 100);
    if (!title.trim()) return toast.error(t("needTitle"));
    if (!(pricePaise > 0)) return toast.error(t("needPrice"));
    if (!picked.length) return toast.error(t("needPhoto"));
    if (!sizes.length) return toast.error(t("needSize"));
    setBusy(true);
    try {
      const shop = await ensureShop(market, profile);
      const ordered = picked.map((k) => cands.find((c) => c.key === k)!).filter(Boolean);
      const images = await Promise.all(ordered.map(persist));
      const mrpPaise = mrp ? Math.round(Number(mrp) * 100) : null;
      const data = { title: title.trim().slice(0, 80), description: desc.trim().slice(0, 600), category, pricePaise, mrpPaise: mrpPaise && mrpPaise > pricePaise ? mrpPaise : null, sizes, stock, images };
      if (editing) {
        await market.updateProduct(profile.id, product!.id, data);
        toast.success(t("saved"));
        router.push("/seller/products");
      } else {
        const isFirst = (await market.listShopProducts(shop.id)).length === 0;
        const created = await market.createProduct(profile.id, { ...data, beforeImage: await beforeRef() });
        if (isFirst) setFirst({ shop, productId: created.id });
        else {
          toast.success(t("published"), { description: t("publishedBody") });
          router.push(`/seller/products?new=${created.id}`);
        }
      }
    } catch (e) {
      toast.error((e as Error).message === "IMAGE" ? t("needPhoto") : tcm("somethingWrong"));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: Product["status"]) => {
    await market.updateProduct(profile.id, product!.id, { status });
    toast.success(t("saved"));
    router.push("/seller/products");
  };

  if (first) return <FirstProduct shop={first.shop} productId={first.productId} />;

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-36 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8 lg:px-6">
        <section className="lg:sticky lg:top-24">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-lg">{t("photos")}</h2>
            <span className="text-sm text-ink-soft">{t("photosHint")}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {cands.map((c) => {
              const n = picked.indexOf(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  role="checkbox"
                  aria-checked={n >= 0}
                  onClick={() => togglePick(c.key)}
                  className={cn("relative aspect-[4/5] overflow-hidden rounded-2xl bg-saffron-50 transition-transform active:scale-95", n >= 0 ? "ring-3 ring-accent" : "opacity-55")}
                >
                  <SmartImage src={c.url} alt="" sizes="160px" />
                  <AnimatePresence>
                    {n >= 0 ? (
                      <motion.span variants={pop} initial="hidden" animate="show" exit="exit" className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                        {n + 1}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              );
            })}
            <button type="button" onClick={openGallery} className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line p-2 text-center text-sm font-semibold text-ink-soft active:scale-95">
              <ImagePlus className="size-7" aria-hidden />
              {t("pickPhotos")}
            </button>
          </div>
        </section>

        <div>
        <section className="mt-5 grid gap-4 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft lg:mt-0">
          <label className="grid gap-1 font-semibold">
            {t("name")}
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("namePlaceholder")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 font-semibold">
              {t("price")}
              <input className={input} value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="999" />
            </label>
            <label className="grid gap-1 text-[15px] font-semibold">
              {t("mrp")}
              <input className={input} value={mrp} onChange={(e) => setMrp(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="1299" />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("category")}</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  selected={category === c}
                  onClick={() => {
                    setCategory(c);
                    setSizes(SIZE_PRESETS[c].length === 1 ? SIZE_PRESETS[c] : SIZE_PRESETS[c].slice(0, 4));
                  }}
                >
                  {tc(c)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("sizes")}</legend>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS[category].map((s) => (
                <Chip key={s} role="checkbox" selected={sizes.includes(s)} onClick={() => setSizes((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>
                  {s}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div>
            <p className="mb-2 font-semibold">{t("stockQty")}</p>
            <div className="flex w-fit items-center rounded-full border-2 border-line" role="group" aria-label={t("stockQty")}>
              <button type="button" onClick={() => setStock((s) => Math.max(0, s - 1))} className="flex size-12 items-center justify-center" aria-label="−1">
                <Minus className="size-5" aria-hidden />
              </button>
              <motion.span key={stock} {...valueRoll} className="w-12 text-center font-display text-xl font-bold tabular-nums" aria-live="polite">
                {stock}
              </motion.span>
              <button type="button" onClick={() => setStock((s) => Math.min(999, s + 1))} className="flex size-12 items-center justify-center" aria-label="+1">
                <Plus className="size-5" aria-hidden />
              </button>
            </div>
          </div>
          <label className="grid gap-1 font-semibold">
            {t("description")}
            <textarea className={cn(input, "min-h-24 py-2")} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("descPlaceholder")} />
          </label>
        </section>

        {editing ? (
          <section className="mt-4 grid gap-2">
            {product!.status === "active" ? (
              <>
                <Button variant="outline" onClick={() => setStatus("soldout")}>
                  <PackageX aria-hidden />
                  {t("markSoldOut")}
                </Button>
                <Button variant="outline" onClick={() => setStatus("hidden")}>
                  <EyeOff aria-hidden />
                  {t("hide")}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setStatus("active")}>
                <RotateCcw aria-hidden />
                {product!.status === "hidden" ? t("unhide") : t("markActive")}
              </Button>
            )}
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden />
              {t("delete")}
            </Button>
          </section>
        ) : null}
        </div>
      </main>

      <div className="fixed-bar safe-bottom z-20 border-t border-line bg-cream/95 px-4 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <Button size="xl" block loading={busy} onClick={save}>
            {editing ? <Save aria-hidden /> : <Rocket aria-hidden />}
            {editing ? t("save") : t("publish")}
          </Button>
        </div>
      </div>

      <Sheet open={galleryOpen} onOpenChange={setGalleryOpen} title={t("pickPhotos")}>
        <div className="grid grid-cols-3 gap-2 pb-6">
          {allGens.flatMap((g) =>
            g.images.map((im) => {
              const on = cands.some((c) => c.key === im.id);
              return (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => {
                    if (on) return togglePick(im.id);
                    setCands((c) => [...c, { key: im.id, url: im.url, genId: g.id, imageId: im.id }]);
                    setPicked((p) => [...p, im.id]);
                  }}
                  className="relative aspect-[4/5] overflow-hidden rounded-xl bg-saffron-50"
                  aria-pressed={picked.includes(im.id)}
                >
                  <SmartImage src={im.thumb ?? im.url} alt="" sizes="120px" />
                  {picked.includes(im.id) ? (
                    <span className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-accent text-on-accent">
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete} title={t("delete")} description={t("deleteConfirm")}>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            {tcm("no")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await market.deleteProduct(profile.id, product!.id);
              router.push("/seller/products");
            }}
          >
            <Trash2 aria-hidden />
            {tcm("yes")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
