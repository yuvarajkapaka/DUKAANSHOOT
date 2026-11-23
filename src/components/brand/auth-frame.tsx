import { useTranslations } from "next-intl";
import Image from "next/image";
import { LogoDraw } from "./logo-draw";

const COLLAGE = ["p-red-kanjivaram-1", "p-pink-kurti-2", "p-cream-kurta-1", "p-kids-yellow-frock-1", "p-maroon-bridal-1", "p-blue-check-shirt-2"];

/** Phones: just the form. Laptops/desktops: brand panel with a photo collage on the left. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(460px,560px)]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-saffron-500 via-[#E8871E] to-[#E11D48] p-12 text-night lg:flex lg:flex-col" aria-hidden>
        <div className="flex items-center gap-3">
          <LogoDraw size={56} />
          <span className="font-display text-3xl font-bold">{t("appName")}</span>
        </div>
        <p className="mt-6 max-w-md font-display text-4xl leading-tight font-bold">{t("tagline")}</p>
        <div className="absolute right-[-40px] bottom-[-60px] grid w-[min(70%,560px)] rotate-[-6deg] grid-cols-3 gap-4">
          {COLLAGE.map((src, i) => (
            <Image
              key={src}
              src={`/samples/market/${src}.jpg`}
              alt=""
              width={220}
              height={275}
              sizes="200px"
              className="anim-rise aspect-[4/5] w-full rounded-2xl border-4 border-white/40 object-cover shadow-2xl"
              style={{ animationDelay: `${i * 80}ms`, transform: i % 2 ? "translateY(28px)" : undefined }}
            />
          ))}
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
