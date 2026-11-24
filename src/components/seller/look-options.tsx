"use client";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { SKIN } from "@/lib/art/scene";
import { sampleResultUrl } from "@/lib/art/samples";
import { AGE_GROUPS, BACKGROUNDS, GENDERS, POSES, SKIN_TONES, type Gender, type LookOptions as Look } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODEL_PHOTOS: Record<Gender, string> = {
  woman: sampleResultUrl("saree-red-silk", 0),
  man: sampleResultUrl("kurta-men-cream", 0),
  girl: sampleResultUrl("kids-dress-yellow", 0),
  boy: sampleResultUrl("kids-kurta-green", 0),
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-3 text-lg">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Model + background pickers: visual cards in a horizontal scroller (phones)
 * or a grid (wider panels). The selected card scales up with a glowing border.
 */
export function LookOptions({ look, setLook, panel }: { look: Look; setLook: (p: Partial<Look>) => void; panel?: boolean }) {
  const t = useTranslations("look");
  const tb = useTranslations("backgrounds");
  const kid = look.gender === "girl" || look.gender === "boy";
  const selected = "z-10 scale-[1.04] shadow-[0_0_0_2px_var(--gold),0_0_0_6px_color-mix(in_oklab,var(--gold)_20%,transparent),0_14px_30px_-12px_rgb(21_18_46/0.45)]";
  return (
    <div>
      <Section title={t("model")}>
        <div className="grid grid-cols-4 gap-2 md:gap-3" role="radiogroup" aria-label={t("model")}>
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={look.gender === g}
              onClick={() => setLook({ gender: g })}
              className={cn("edge overflow-hidden rounded-2xl bg-paper shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-95", look.gender === g ? selected : "")}
            >
              <Image src={MODEL_PHOTOS[g]} alt="" width={160} height={200} sizes="(max-width: 767px) 25vw, 160px" className="aspect-square w-full object-cover object-top" />
              <span className="block py-2 text-[15px] font-semibold">{t(g)}</span>
            </button>
          ))}
        </div>
      </Section>

      {!kid ? (
        <Section title={t("age")}>
          <ChipGroup label={t("age")}>
            {AGE_GROUPS.map((a) => (
              <Chip key={a} selected={look.age === a} onClick={() => setLook({ age: a })}>
                {t(a)}
              </Chip>
            ))}
          </ChipGroup>
        </Section>
      ) : null}

      <Section title={t("skin")}>
        <ChipGroup label={t("skin")}>
          {SKIN_TONES.map((s) => (
            <Chip key={s} selected={look.skin === s} onClick={() => setLook({ skin: s })} swatch={SKIN[s]}>
              {t(s)}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title={t("pose")}>
        <ChipGroup label={t("pose")}>
          {POSES.map((p) => (
            <Chip key={p} selected={look.pose === p} onClick={() => setLook({ pose: p })}>
              {t(p)}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title={t("background")}>
        <div
          className={cn(
            "no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 py-2",
            panel ? "md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0" : "md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0",
          )}
          role="radiogroup"
          aria-label={t("background")}
        >
          {BACKGROUNDS.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={look.background === b}
              onClick={() => setLook({ background: b })}
              className={cn(
                "edge relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-paper text-left shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-95 md:w-auto",
                look.background === b ? selected : "border-transparent",
              )}
            >
              <Image src={`/samples/backgrounds/${b}.jpg`} alt="" width={320} height={200} sizes="(max-width: 767px) 160px, 240px" className="aspect-[16/10] w-full object-cover" />
              <span className="block px-3 pt-2 text-[15px] font-semibold">{tb(b)}</span>
              <span className="block px-3 pb-2 text-[13px] text-ink-soft">{b === "white" ? tb("whiteHint") : " "}</span>
              {look.background === b ? (
                <span className="anim-pop absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Check className="size-5" aria-hidden />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
