import { useTranslations } from "next-intl";
import Image from "next/image";
import { LogoDraw } from "./logo-draw";
import { GoldRule, Grain, Jaali, Paisley, RangoliMotif, TempleBorder, Zari } from "./ornaments";

const COLLAGE = ["p-red-kanjivaram-1", "p-pink-kurti-2", "p-cream-kurta-1", "p-kids-yellow-frock-1", "p-maroon-bridal-1", "p-blue-check-shirt-2"];
// the three promises, reused from the intro cards so they stay translated
const PROOF = ["s1t", "s2t", "s3t"] as const;

/**
 * Phones: just the form.
 * Laptops/desktops: an editorial brand panel — deep indigo, jaali screen, a temple
 * border in brass, arch-framed photographs and a serif promise.
 */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const ti = useTranslations("intro");
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(460px,560px)]">
      <aside className="panel-night relative hidden overflow-hidden p-12 xl:p-16 lg:flex lg:flex-col" aria-hidden>
        <Jaali className="text-gold-light opacity-[0.08]" />
        <RangoliMotif className="spin-slow absolute -top-[18%] -left-[14%] size-[60vmin] text-gold-light opacity-[0.07]" />
        <Paisley className="absolute top-10 right-10 size-40 text-gold-light opacity-[0.12]" />
        <Grain />
        <TempleBorder className="absolute inset-x-0 top-0 h-1.5 text-gold opacity-60" />

        <div className="relative flex items-center gap-4">
          <LogoDraw size={58} id="auth" />
          <span className="text-foil font-display text-3xl font-semibold">{t("appName")}</span>
        </div>

        <GoldRule className="relative mt-8 max-w-sm" diamond={false} />
        <p className="relative mt-6 max-w-md font-display text-[2.6rem] leading-[1.08] font-semibold text-[#fdf7ee]">{t("tagline")}</p>

        <ul className="relative mt-7 flex flex-wrap gap-x-6 gap-y-2">
          {PROOF.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em] text-gold-light/85 uppercase">
              <Zari className="size-2.5" />
              {ti(p)}
            </li>
          ))}
        </ul>

        {/* the collage: each photograph framed by a Mughal arch with a brass hairline */}
        <div className="absolute right-[-48px] bottom-[-72px] grid w-[min(72%,580px)] rotate-[-5deg] grid-cols-3 gap-5">
          {COLLAGE.map((src, i) => (
            <span key={src} className="anim-rise relative block" style={{ animationDelay: `${i * 90}ms`, transform: i % 2 ? "translateY(30px)" : undefined }}>
              <Image
                src={`/samples/market/${src}.jpg`}
                alt=""
                width={220}
                height={275}
                sizes="200px"
                className="arch-soft aspect-[4/5] w-full object-cover shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_55%,transparent),0_24px_48px_-18px_rgb(0_0_0/0.75)]"
              />
              <span className="arch-soft absolute inset-0 bg-[linear-gradient(160deg,rgb(255_255_255/0.22),transparent_42%)]" />
            </span>
          ))}
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
