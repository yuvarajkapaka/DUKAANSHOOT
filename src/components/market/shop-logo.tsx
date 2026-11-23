"use client";
import { Store } from "lucide-react";
import { useImageRef } from "@/lib/client/image-ref";
import type { Shop } from "@/lib/market/types";
import { cn } from "@/lib/utils";

export function ShopLogo({ shop, size = 48, className }: { shop: Pick<Shop, "logo" | "name">; size?: number; className?: string }) {
  const url = useImageRef(shop.logo);
  const style = { width: size, height: size };
  if (!url) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-accent-soft", className)} style={style}>
        <Store className="text-accent-strong" style={{ width: size / 2, height: size / 2 }} aria-hidden />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={size} height={size} className={cn("shrink-0 rounded-2xl object-cover", className)} style={style} />;
}
