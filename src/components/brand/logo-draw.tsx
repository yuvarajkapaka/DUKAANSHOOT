/** The DukaanShoot logo drawing itself (SVG stroke animation, CSS only). */
export function LogoDraw({ size = 132 }: { size?: number }) {
  const stroke = { strokeDasharray: 1, strokeDashoffset: 1, animation: "draw .9s cubic-bezier(.6,0,.3,1) forwards" } as const;
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden>
      <rect width="512" height="512" rx="112" fill="#E8871E" className="anim-pop" />
      <g fill="none" stroke="#FFF8EE" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
        <path pathLength={1} style={stroke} d="M140 182h232a44 44 0 0 1 44 44v122a44 44 0 0 1-44 44H140a44 44 0 0 1-44-44V226a44 44 0 0 1 44-44z" />
        <path pathLength={1} style={{ ...stroke, animationDelay: ".35s" }} d="M196 182l22-40h76l22 40" />
      </g>
      <circle pathLength={1} cx="256" cy="288" r="62" fill="none" stroke="#1E1B4B" strokeWidth="26" style={{ ...stroke, animationDelay: ".55s" }} />
      <path d="M362 96l10 26 26 10-26 10-10 26-10-26-26-10 26-10z" fill="#1E1B4B" className="anim-pop" style={{ animationDelay: "1.1s" }} />
    </svg>
  );
}
