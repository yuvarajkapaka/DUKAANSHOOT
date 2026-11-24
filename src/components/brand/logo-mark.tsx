import { cn } from "@/lib/utils";
import { RangoliMotif } from "./ornaments";

/**
 * The brand mark: a deep indigo tile with a gold rangoli mandala turning slowly
 * inside it, a 1px brass hairline, and a specular corner highlight. The wordmark
 * is set in the serif display face with a foil gradient.
 */
export function LogoMark({
  size = 40,
  label = "DukaanShoot",
  wordmark = true,
  className,
  wordClass,
}: {
  size?: number;
  label?: string;
  wordmark?: boolean;
  className?: string;
  wordClass?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <span
        className="panel-night relative flex shrink-0 items-center justify-center rounded-[32%] shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_45%,transparent),0_6px_16px_-8px_rgb(21_18_46/0.6)]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span className="bg-kolam absolute inset-0 rounded-[32%] text-gold-light opacity-20" />
        <RangoliMotif className="spin-slow relative text-gold-light" strokeWidth={2.4} size={Math.round(size * 0.72)} />
        {/* glass highlight across the top-left corner */}
        <span className="absolute inset-0 rounded-[32%] bg-[linear-gradient(145deg,rgb(255_255_255/0.28),transparent_45%)]" />
      </span>
      {wordmark ? (
        <span className={cn("font-display text-[21px] leading-none font-semibold tracking-[-0.02em]", wordClass)}>{label}</span>
      ) : null}
    </span>
  );
}
