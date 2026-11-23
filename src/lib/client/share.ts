"use client";
import { downloadBlob } from "./image";

export type ShareResult = "shared" | "cancelled" | "fallback";

/**
 * Share photos to WhatsApp. Uses the Web Share API with files (Android Chrome
 * shows WhatsApp in the share sheet). Where file sharing is not supported we
 * save the photos and open wa.me with a message instead.
 */
export async function sharePhotos(blobs: Blob[], text: string): Promise<ShareResult> {
  const files = blobs.map((b, i) => new File([b], `dukaanshoot-${Date.now()}-${i + 1}.jpg`, { type: "image/jpeg" }));
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files })) {
    try {
      await nav.share({ files, text });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  files.forEach((f) => downloadBlob(f, f.name));
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return "fallback";
}
