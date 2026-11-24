import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import { NavEffects } from "@/components/nav-effects";
import { Providers } from "@/components/providers";
import { ServiceWorker } from "@/components/service-worker";
import { publicConfig } from "@/lib/server/env";
import "./globals.css";

// "Rangoli Grid · Atelier" type pairing:
//  - Fraunces (variable serif, optical sizing) is the editorial voice: headlines, prices, numbers.
//  - Bricolage Grotesque runs the interface: buttons, labels, body copy, navigation.
// Telugu / Devanagari fall back to the phone's Noto fonts (see globals.css).
const brico = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-brico", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

/** runs before paint: dark mode + seller/buyer accent, so nothing flashes */
const BOOT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("ds_theme");if(t==="dark")d.classList.add("dark");d.dataset.side=location.pathname.indexOf("/seller")===0?"seller":"buyer"}catch(e){}})()`;

export const metadata: Metadata = {
  title: "DukaanShoot — Model photos for your shop",
  description: "Take a photo of a saree or kurta. Get 4 beautiful model photos in a minute. Share on WhatsApp.",
  applicationName: "DukaanShoot",
  appleWebApp: { capable: true, title: "DukaanShoot", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF4EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0A18" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${brico.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="font-sans antialiased">
        <NavEffects />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers config={publicConfig()}>{children}</Providers>
        </NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
