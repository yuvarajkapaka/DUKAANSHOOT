"use client";
import { m as motion } from "framer-motion";
import { CheckCircle2, Circle, FileArchive, ImagePlus, ListChecks, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useAuthed } from "@/components/providers";
import { WhatsAppIcon } from "@/components/results/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { downloadBlob } from "@/lib/client/image";
import { sharePhotos } from "@/lib/client/share";
import type { GarmentType, Generation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Tile {
  key: string;
  genId: string;
  imageId: string;
  url: string;
  garmentType: GarmentType;
  createdAt: string;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function GalleryPage() {
  const t = useTranslations("gallery");
  const tg = useTranslations("garment");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { repo, profile } = useAuthed();
  const [gens, setGens] = useState<Generation[] | null>(null);
  const [filter, setFilter] = useState<GarmentType | "all">("all");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"zip" | "share" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = () => repo.listGenerations().then(setGens).catch(() => setGens([]));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  const tiles: Tile[] = useMemo(
    () =>
      (gens ?? []).flatMap((g) =>
        g.images.map((im) => ({ key: `${g.id}:${im.id}`, genId: g.id, imageId: im.id, url: im.thumb ?? im.url, garmentType: g.garmentType, createdAt: g.createdAt })),
      ),
    [gens],
  );
  const types = useMemo(() => Array.from(new Set(tiles.map((x) => x.garmentType))), [tiles]);
  const visible = tiles.filter((x) => filter === "all" || x.garmentType === filter);

  const groups = useMemo(() => {
    const today = dayKey(new Date().toISOString());
    const yesterday = dayKey(new Date(Date.now() - 86400_000).toISOString());
    const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-IN" : `${locale}-IN`, { day: "numeric", month: "long", year: "numeric" });
    const map = new Map<string, { label: string; tiles: Tile[] }>();
    for (const tile of visible) {
      const k = dayKey(tile.createdAt);
      const label = k === today ? t("today") : k === yesterday ? t("yesterday") : fmt.format(new Date(tile.createdAt));
      if (!map.has(k)) map.set(k, { label, tiles: [] });
      map.get(k)!.tiles.push(tile);
    }
    return Array.from(map.values());
  }, [visible, locale, t]);

  const chosen = tiles.filter((x) => selected.has(x.key));
  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const blobs = async () => (await Promise.all(chosen.map((c) => repo.getImageBlob(c.genId, c.imageId)))).filter((b): b is Blob => !!b);

  const zip = async () => {
    setBusy("zip");
    const id = toast.loading(t("zipping"));
    try {
      const { default: JSZip } = await import("jszip");
      const z = new JSZip();
      (await blobs()).forEach((b, i) => z.file(`photo-${i + 1}.jpg`, b));
      const out = await z.generateAsync({ type: "blob" });
      downloadBlob(out, `${(profile.shopName || "dukaanshoot").replace(/\s+/g, "-")}-photos.zip`);
      toast.success(t("zip"), { id });
      exitSelect();
    } catch {
      toast.error(tc("somethingWrong"), { id });
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      await sharePhotos(await blobs(), profile.shopName);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    for (const c of chosen) await repo.deleteImage(c.genId, c.imageId);
    setBusy(null);
    setConfirmDelete(false);
    exitSelect();
    await load();
  };

  return (
    <>
      <AppHeader side="seller" />
      <main className="mx-auto max-w-[1440px] px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {tiles.length ? (
            selecting ? (
              <Button variant="ghost" size="sm" onClick={exitSelect}>
                <X aria-hidden />
                {tc("cancel")}
              </Button>
            ) : (
              <Button variant="soft" size="sm" onClick={() => setSelecting(true)}>
                <ListChecks aria-hidden />
                {t("select")}
              </Button>
            )
          ) : null}
        </div>

        {types.length > 1 ? (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label={t("title")}>
            <Chip selected={filter === "all"} onClick={() => setFilter("all")} className="shrink-0">
              {t("all")}
            </Chip>
            {types.map((g) => (
              <Chip key={g} selected={filter === g} onClick={() => setFilter(g)} className="shrink-0">
                {tg(g)}
              </Chip>
            ))}
          </div>
        ) : null}

        {gens === null ? (
          <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="skeleton aspect-[4/5] rounded-xl" />
            ))}
          </div>
        ) : !tiles.length ? (
          <div className="mt-10 flex flex-col items-center gap-4 text-center text-lg text-ink-soft">
            <ImagePlus className="size-12" aria-hidden />
            {t("empty")}
            <Button asChild>
              <Link href="/seller/create/capture">📷 {t("title")}</Link>
            </Button>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mt-5">
              <h2 className="mb-2 text-[15px] font-bold tracking-wide text-ink-soft uppercase">{g.label}</h2>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
                {g.tiles.map((tile, i) => {
                  const on = selected.has(tile.key);
                  const img = (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tile.url} alt={tg(tile.garmentType)} loading="lazy" decoding="async" className={cn("aspect-[4/5] w-full object-cover transition", on && "scale-90 rounded-lg")} />
                  );
                  return (
                    <motion.div key={tile.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}>
                      {selecting ? (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          aria-label={tg(tile.garmentType)}
                          onClick={() => toggle(tile.key)}
                          className={cn("relative block w-full overflow-hidden rounded-xl bg-saffron-100", on && "ring-3 ring-saffron-500")}
                        >
                          {img}
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-white">
                            {on ? <CheckCircle2 className="size-7 fill-saffron-500 text-ink" aria-hidden /> : <Circle className="size-7 text-ink-soft" aria-hidden />}
                          </span>
                        </button>
                      ) : (
                        <Link href={`/seller/create/results/${tile.genId}`} className="block overflow-hidden rounded-xl bg-saffron-50 shadow-soft">
                          {img}
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {selecting ? (
        <div className="fixed-bar z-30 px-4 pb-2 md:pb-4">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mx-auto max-w-3xl rounded-3xl bg-night p-3 text-white shadow-2xl">
            <p className="px-1 pb-2 font-semibold">{t("selected", { count: chosen.length })}</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="whatsapp" size="sm" disabled={!chosen.length} loading={busy === "share"} onClick={share}>
                <WhatsAppIcon className="size-5" />
                {t("share")}
              </Button>
              <Button size="sm" disabled={!chosen.length} loading={busy === "zip"} onClick={zip}>
                <FileArchive aria-hidden />
                ZIP
              </Button>
              <Button variant="outline" size="sm" className="border-white/20 bg-white/10 text-white" disabled={!chosen.length} onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden />
                {t("deleteSelected")}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete} title={t("deleteConfirm", { count: chosen.length })}>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            {tc("no")}
          </Button>
          <Button variant="danger" loading={busy === "delete"} onClick={remove}>
            <Trash2 aria-hidden />
            {tc("yes")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
