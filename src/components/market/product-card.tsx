"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { haptic } from "@/lib/client/effects";
import { useMarketState } from "../market-state";
import type { Product, Shop } from "@/lib/market/types";
import { cn, rupees } from "@/lib/utils";
import { SmartImage } from "../ui/smart-image";
import { HeartButton } from "./heart-button";

/**
 * Starts a View Transition so the card image expands into the product page
 * hero (shared-element). Falls back to a normal navigation.
 */
export function navigateWithTransition(router: ReturnType<typeof useRouter>, href: string, img?: HTMLElement | null) {
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { ready: Promise<void>; finished: Promise<void> } };
  if (!doc.startViewTransition || !img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    router.push(href);
    return;
  }
  // only one element may carry the name when the transition starts
  document.querySelectorAll<HTMLElement>("[style*='product-hero']").forEach((el) => (el.style.viewTransitionName = ""));
  img.style.viewTransitionName = "product-hero";
  const vt = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const w = window as Window & { __heroReady?: () => void };
        const done = () => {
          img.style.viewTransitionName = "";
          w.__heroReady = undefined;
          resolve();
        };
        w.__heroReady = done;
        router.push(href);
        setTimeout(done, 1200);
      }),
  );
  // a transition can be skipped (e.g. the phone rotates) — navigation still happens, so ignore it
  vt.ready.catch(() => {});
  vt.finished.catch(() => {});
}

const CARD_SIZES = "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, (max-width: 1535px) 20vw, 240px";

export function ProductCard({ product, shop, index = 0, priority }: { product: Product; shop?: Shop | null; index?: number; priority?: boolean }) {
  const t = useTranslations("market");
  const router = useRouter();
  const imgRef = useRef<HTMLDivElement>(null);
  const { toggleWishlist } = useMarketState();
  // long-press (touch) saves to the wishlist instead of opening the product
  const press = useRef<{ timer?: ReturnType<typeof setTimeout>; fired: boolean }>({ fired: false });
  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    press.current.fired = false;
    press.current.timer = setTimeout(() => {
      press.current.fired = true;
      haptic(25);
      void toggleWishlist(product.id);
    }, 550);
  };
  const endPress = () => clearTimeout(press.current.timer);
  const href = `/product/${product.id}`;
  const sold = product.status === "soldout" || product.stock <= 0;
  const off = product.mrpPaise && product.mrpPaise > product.pricePaise ? Math.round((1 - product.pricePaise / product.mrpPaise) * 100) : 0;
  return (
    <article style={{ "--i": index } as React.CSSProperties} className="group relative">
      <Link
        href={href}
        onClick={(e) => {
          if (press.current.fired) {
            e.preventDefault();
            press.current.fired = false;
            return;
          }
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab / right-click stay native
          e.preventDefault();
          navigateWithTransition(router, href, imgRef.current);
        }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => press.current.fired && e.preventDefault()}
        className="block rounded-[22px] bg-paper p-2 shadow-soft transition-[transform,box-shadow] duration-200 select-none active:scale-[0.98] hover:-translate-y-1 hover:-rotate-[0.6deg] hover:shadow-warm"
      >
        <div ref={imgRef} className="relative aspect-[4/5] overflow-hidden rounded-[15px] bg-saffron-50">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
            <SmartImage src={product.images[0]} alt={product.title} priority={priority} sizes={CARD_SIZES} className={cn(sold && "grayscale-[60%]")} />
          </div>
          {/* mouse users: the second photo fades in on hover */}
          {product.images[1] ? (
            <div className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100 [@media(hover:hover)]:block">
              <SmartImage src={product.images[1]} alt="" sizes={CARD_SIZES} />
            </div>
          ) : null}
          {sold ? <span className="absolute inset-x-0 bottom-0 bg-night/85 py-1.5 text-center text-sm font-bold text-white">{t("soldOut")}</span> : null}
          {!sold && off ? <span className="absolute top-2 left-2 rounded-lg border-2 border-[#1E1B4B] bg-[#16A34A] px-1.5 py-0.5 text-xs font-extrabold text-white">{t("off", { n: off })}</span> : null}
          {!sold && product.stock <= 3 ? <span className="absolute bottom-2 left-2 rounded-lg border-2 border-[#1E1B4B] bg-white px-1.5 py-0.5 text-xs font-bold text-danger">{t("onlyLeft", { n: product.stock })}</span> : null}
          {/* sticker price tag: wiggles while the card is hovered */}
          {!sold ? <span className="sticker sticker-hover absolute right-2 bottom-2.5 px-2 py-0.5 font-display text-[15px] md:text-base">{rupees(product.pricePaise)}</span> : null}
        </div>
        <div className="px-1.5 pt-2 pb-1">
          <p className="line-clamp-2 min-h-[2.6em] text-[15px] leading-snug font-bold">{product.title}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-[13px] text-ink-soft">
            {sold ? <span className="font-display text-base font-bold text-ink">{rupees(product.pricePaise)}</span> : null}
            {off ? <span className="line-through">{rupees(product.mrpPaise!)}</span> : null}
            {shop ? <span className="truncate">{shop.name} · {shop.city}</span> : null}
          </p>
        </div>
      </Link>
      <HeartButton productId={product.id} className="absolute top-3.5 right-3.5" />
    </article>
  );
}

export function ProductGrid({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("stagger grid grid-cols-2 gap-3 md:gap-4", wide ? "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" : "md:grid-cols-3")}>{children}</div>;
}

export function ProductGridSkeleton({ n = 6, wide }: { n?: number; wide?: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:gap-4", wide ? "md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" : "md:grid-cols-3")} aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="rounded-[22px] bg-paper p-2 shadow-soft">
          <div className="skeleton aspect-[4/5] rounded-[15px]" />
          <div className="space-y-2 px-1.5 pt-2.5 pb-1">
            <div className="skeleton h-4 rounded" />
            <div className="skeleton h-5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
