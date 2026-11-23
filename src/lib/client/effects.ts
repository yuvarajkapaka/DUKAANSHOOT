"use client";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Tiny haptic tick on Android (ignored elsewhere). */
export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

let audio: AudioContext | null = null;
/** Soft two-note "ding" made with Web Audio — no sound file to download. */
export function playDing() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
    const t = audio.currentTime;
    for (const [freq, at] of [
      [880, 0],
      [1318.5, 0.12],
    ] as const) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(0.25, t + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.6);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + at);
      osc.stop(t + at + 0.65);
    }
  } catch {
    /* audio blocked until the user has tapped something — fine */
  }
}

/** The product thumbnail flies into the cart icon; the badge then bounces. Transform + opacity only. */
export function flyToCart(from: HTMLElement) {
  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).find((el) => el.offsetParent !== null);
  window.setTimeout(() => window.dispatchEvent(new Event("cart-bump")), reduced() ? 0 : 650);
  if (!target || reduced()) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.min(a.width, 120);
  const ghost = document.createElement("div");
  const src = from instanceof HTMLImageElement ? from.currentSrc || from.src : from.querySelector("img")?.currentSrc;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size * 1.25}px`,
    borderRadius: "16px",
    backgroundImage: src ? `url("${src}")` : "",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 8px 24px rgba(232,135,30,.35)",
    zIndex: "80",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(.6)`, opacity: 0.95, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.4 },
    ],
    { duration: 650, easing: "cubic-bezier(.5,0,.6,1)" },
  );
  anim.onfinish = () => ghost.remove();
}

/** Light confetti burst (canvas-confetti, loaded only when needed). */
export async function confetti(opts: { y?: number; count?: number } = {}) {
  if (reduced()) return;
  const { default: c } = await import("canvas-confetti");
  const colors = ["#E8871E", "#E11D48", "#FACC15", "#16A34A", "#2563EB"];
  c({ particleCount: opts.count ?? 90, spread: 75, startVelocity: 38, origin: { y: opts.y ?? 0.45 }, colors, scalar: 0.9, ticks: 160, disableForReducedMotion: true });
}
