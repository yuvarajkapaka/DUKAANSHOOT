/**
 * The DukaanShoot logo drawing itself (SVG stroke animation, CSS only).
 *
 * Atelier version: an indigo tile with a brass hairline, a gold rangoli halo that
 * fades up behind the camera, the camera body drawn in gold and the lens in cream,
 * finished with a zari star. Gradients are declared per instance so two logos on
 * one page never collide.
 */
export function LogoDraw({ size = 132, id = "ds" }: { size?: number; id?: string }) {
  const stroke = { strokeDasharray: 1, strokeDashoffset: 1, animation: "draw .9s cubic-bezier(.6,0,.3,1) forwards" } as const;
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b2358" />
          <stop offset="55%" stopColor="#1a1540" />
          <stop offset="100%" stopColor="#0f0c26" />
        </linearGradient>
        <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3dca2" />
          <stop offset="45%" stopColor="#e9c877" />
          <stop offset="100%" stopColor="#c08a2e" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#e8871e" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e8871e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="512" height="512" rx="128" fill={`url(#${id}-tile)`} className="anim-pop" />
      <rect x="6" y="6" width="500" height="500" rx="122" fill="none" stroke={`url(#${id}-foil)`} strokeWidth="3" opacity="0.7" />
      <rect width="512" height="512" rx="128" fill={`url(#${id}-glow)`} className="anim-fade" style={{ animationDelay: ".3s" }} />

      {/* rangoli halo: 8 dotted spokes behind the camera */}
      <g className="anim-fade" style={{ animationDelay: ".75s" }} opacity="0.5">
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 45} 256 288)`}>
            <path d="M256 150v34" stroke="#E9C877" strokeWidth="7" strokeLinecap="round" strokeDasharray="7 14" />
          </g>
        ))}
        <circle cx="256" cy="288" r="150" fill="none" stroke="#E9C877" strokeWidth="3" strokeDasharray="2 16" />
      </g>

      {/* camera body + hood, drawn in brass */}
      <g fill="none" stroke={`url(#${id}-foil)`} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round">
        <path pathLength={1} style={stroke} d="M140 182h232a44 44 0 0 1 44 44v122a44 44 0 0 1-44 44H140a44 44 0 0 1-44-44V226a44 44 0 0 1 44-44z" />
        <path pathLength={1} style={{ ...stroke, animationDelay: ".35s" }} d="M196 182l22-40h76l22 40" />
      </g>
      {/* lens */}
      <circle pathLength={1} cx="256" cy="288" r="62" fill="none" stroke="#FFF8EE" strokeWidth="24" style={{ ...stroke, animationDelay: ".55s" }} />
      <circle cx="256" cy="288" r="26" fill="#FFF8EE" opacity="0.14" className="anim-pop" style={{ animationDelay: "1s" }} />
      {/* zari star */}
      <path
        d="M372 86c4 30 15 41 45 45-30 4-41 15-45 45-4-30-15-41-45-45 30-4 41-15 45-45z"
        fill={`url(#${id}-foil)`}
        className="anim-pop"
        style={{ animationDelay: "1.1s" }}
      />
    </svg>
  );
}
