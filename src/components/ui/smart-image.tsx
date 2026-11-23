"use client";
import Image from "next/image";
import { forwardRef, useState } from "react";
import blurMap from "@/lib/art/blur-map.json";
import { useImageRef } from "@/lib/client/image-ref";
import { cn } from "@/lib/utils";

const BLUR = blurMap as Record<string, string>;

/** "rrggbb" ×4 (a 2x2 colour grid) → a softly blurred SVG placeholder */
function blurSvg(hex?: string) {
  if (!hex || hex.length !== 24) return undefined;
  const c = [0, 6, 12, 18].map((i) => "#" + hex.slice(i, i + 6));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2" preserveAspectRatio="none"><filter id="b"><feGaussianBlur stdDeviation=".5"/></filter><g filter="url(#b)"><rect width="1" height="1" fill="${c[0]}"/><rect x="1" width="1" height="1" fill="${c[1]}"/><rect y="1" width="1" height="1" fill="${c[2]}"/><rect x="1" y="1" width="1" height="1" fill="${c[3]}"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * next/image with a blur placeholder for catalogue photos and a warm shimmer
 * for everything else (device images, uploads). Fades in when loaded.
 */
export const SmartImage = forwardRef<
  HTMLImageElement,
  {
    src: string | null | undefined;
    alt: string;
    className?: string;
    sizes?: string;
    priority?: boolean;
    fill?: boolean;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
  }
>(function SmartImage({ src, alt, className, sizes = "(max-width: 480px) 50vw, 240px", priority, fill = true, width, height, style }, ref) {
  const url = useImageRef(src);
  const [loaded, setLoaded] = useState(false);
  const blur = src ? blurSvg(BLUR[src]) : undefined;
  if (!url) return <span className={cn("skeleton block", fill && "absolute inset-0", className)} aria-hidden />;
  return (
    <>
      {!blur && !loaded ? <span className={cn("skeleton block", fill && "absolute inset-0")} aria-hidden /> : null}
      <Image
        ref={ref}
        src={url}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes}
        priority={priority}
        placeholder={blur ? "blur" : "empty"}
        blurDataURL={blur}
        onLoad={() => setLoaded(true)}
        className={cn("object-cover transition-opacity duration-300", !blur && !loaded ? "opacity-0" : "opacity-100", className)}
        style={style}
        unoptimized={url.startsWith("blob:")}
      />
    </>
  );
});
