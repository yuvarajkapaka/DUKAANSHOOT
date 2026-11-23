import { cn } from "@/lib/utils";

/** Rangoli Grid logo: an indigo tile with a slowly turning rangoli flower, plus the wordmark. */
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
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <span className="flex shrink-0 items-center justify-center rounded-[30%] border-2 border-ink bg-night" style={{ width: size, height: size }} aria-hidden>
        <svg className="spin-slow" width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#F4B66A" strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" />
        </svg>
      </span>
      {wordmark ? <span className={cn("font-display text-[21px] leading-none font-extrabold tracking-[-0.03em] lowercase", wordClass)}>{label}</span> : null}
    </span>
  );
}
