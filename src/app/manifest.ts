import type { MetadataRoute } from "next";

/** Android "Add to Home screen" — the splash screen is built from name + background_color + icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DukaanShoot — Model photos for your shop",
    short_name: "DukaanShoot",
    description: "Photo of your saree or kurta → 4 model photos → share on WhatsApp.",
    start_url: "/home?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFAF3",
    theme_color: "#E8871E",
    lang: "en-IN",
    categories: ["business", "photo", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
