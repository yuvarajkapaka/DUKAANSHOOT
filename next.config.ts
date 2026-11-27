import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // phones get small images, desktops sharp ones; AVIF/WebP where the browser supports it
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [48, 64, 96, 128, 160, 240, 320, 400],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  // put <title>/<meta> in <head> for every client (Next 15 otherwise streams them for non-bots)
  htmlLimitedBots: /.*/,
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // old single-role URLs → seller side
  async redirects() {
    return [
      { source: "/home", destination: "/seller", permanent: false },
      { source: "/gallery", destination: "/seller/gallery", permanent: false },
      { source: "/credits/:path*", destination: "/seller/credits/:path*", permanent: false },
      { source: "/settings", destination: "/seller/settings", permanent: false },
      { source: "/create/:path*", destination: "/seller/create/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/samples/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // nobody may frame the app (clickjacking); <base> and plugins can't be injected
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self)" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
