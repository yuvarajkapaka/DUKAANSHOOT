/**
 * DukaanShoot illustration engine.
 *
 * Pure TypeScript, NO imports — this file is used both by the browser (to
 * composite an uploaded garment photo onto a model in MockProvider mode) and
 * by `scripts/generate-assets.mjs` (Node strips the types natively) to
 * pre-render sample garments + sample result photos into /public.
 *
 * Everything is drawn in a "figure space" of 400 x 1000 units, then placed in
 * the output frame with a 2D affine matrix.
 */

export type Gender = "woman" | "man" | "girl" | "boy";
export type AgeGroup = "young" | "adult" | "senior";
export type SkinTone = "light" | "wheatish" | "medium" | "dusky";
export type Pose = "standing" | "side" | "hip" | "closeup";
export type BackgroundId = "white" | "studio" | "wedding" | "street" | "festive" | "shop";
export type GarmentKind =
  | "saree"
  | "kurta"
  | "shirt"
  | "tshirt"
  | "dress"
  | "lehenga"
  | "pants"
  | "other";

export type FabricPattern = "plain" | "buti" | "checks" | "stripes" | "floral" | "zigzag" | "polka" | "chikan";

export interface Fabric {
  base: string;
  accent: string;
  pattern: FabricPattern;
  trim?: string;
}

export interface SceneOptions {
  garment: GarmentKind;
  gender: Gender;
  age: AgeGroup;
  skin: SkinTone;
  pose: Pose;
  background: BackgroundId;
  /** 0..3 — small variations between the 4 photos */
  variant?: number;
  /** used by pre-rendered samples; omitted when the garment is a user photo */
  fabric?: Fabric;
}

export const OUT_W = 900;
export const OUT_H = 1125;

export const SKIN: Record<SkinTone, string> = {
  light: "#F1C9A5",
  wheatish: "#DFAA7C",
  medium: "#C1855A",
  dusky: "#8A5839",
};

type Pt = [number, number];
type Matrix = [number, number, number, number, number, number];

interface Build {
  cx: number;
  headY: number;
  headR: number;
  neckBot: number;
  shY: number;
  shW: number;
  chestY: number;
  waistY: number;
  waistW: number;
  hipY: number;
  hipW: number;
  kneeY: number;
  ankleY: number;
  footY: number;
  armW: number;
  neckW: number;
}

const BUILDS: Record<Gender, Build> = {
  woman: { cx: 200, headY: 92, headR: 44, neckBot: 162, shY: 176, shW: 72, chestY: 246, waistY: 345, waistW: 48, hipY: 432, hipW: 78, kneeY: 690, ankleY: 925, footY: 962, armW: 24, neckW: 15 },
  man: { cx: 200, headY: 90, headR: 46, neckBot: 166, shY: 180, shW: 92, chestY: 256, waistY: 362, waistW: 64, hipY: 444, hipW: 72, kneeY: 700, ankleY: 930, footY: 966, armW: 30, neckW: 19 },
  girl: { cx: 200, headY: 126, headR: 70, neckBot: 214, shY: 224, shW: 62, chestY: 290, waistY: 395, waistW: 50, hipY: 470, hipW: 62, kneeY: 712, ankleY: 922, footY: 958, armW: 22, neckW: 14 },
  boy: { cx: 200, headY: 124, headR: 70, neckBot: 214, shY: 224, shW: 68, chestY: 292, waistY: 400, waistW: 54, hipY: 476, hipW: 60, kneeY: 714, ankleY: 924, footY: 960, armW: 23, neckW: 15 },
};

/* ------------------------------------------------------------------ utils */

const f = (n: number) => (Math.round(n * 10) / 10).toString();

function shade(hex: string, amt: number): string {
  // amt -1..1 : darken / lighten
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/** Tiny deterministic PRNG so the same scene always renders identically. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/** Path builder that also tracks a bounding box. */
class PathB {
  d = "";
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;
  private track(p: Pt) {
    this.minX = Math.min(this.minX, p[0]);
    this.minY = Math.min(this.minY, p[1]);
    this.maxX = Math.max(this.maxX, p[0]);
    this.maxY = Math.max(this.maxY, p[1]);
  }
  M(p: Pt) {
    this.track(p);
    this.d += `M${f(p[0])} ${f(p[1])}`;
    return this;
  }
  L(p: Pt) {
    this.track(p);
    this.d += `L${f(p[0])} ${f(p[1])}`;
    return this;
  }
  Q(c: Pt, p: Pt) {
    this.track(c);
    this.track(p);
    this.d += `Q${f(c[0])} ${f(c[1])} ${f(p[0])} ${f(p[1])}`;
    return this;
  }
  Z() {
    this.d += "Z";
    return this;
  }
  /** Closed outline around a polyline, i.e. a "thick line" polygon. */
  thick(points: Pt[], w0: number, w1 = w0) {
    const [left, right] = offsets(points, w0, w1);
    const n = points.length;
    this.M(left[0]);
    for (let i = 1; i < n; i++) this.L(left[i]);
    for (let i = n - 1; i >= 0; i--) this.L(right[i]);
    return this.Z();
  }
  get bbox() {
    return { x: this.minX, y: this.minY, w: this.maxX - this.minX, h: this.maxY - this.minY };
  }
}

function offsets(points: Pt[], w0: number, w1: number): [Pt[], Pt[]] {
    const left: Pt[] = [];
    const right: Pt[] = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(n - 1, i + 1)];
      let dx = next[0] - prev[0];
      let dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const w = (w0 + (w1 - w0) * (i / Math.max(1, n - 1))) / 2;
      left.push([points[i][0] - dy * w, points[i][1] + dx * w]);
      right.push([points[i][0] + dy * w, points[i][1] - dx * w]);
    }
  return [left, right];
}

const poly = (pts: Pt[]) => "M" + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L");
/** the two long edges of a thick band — used for zari borders */
function bandEdges(points: Pt[], w0: number, w1 = w0) {
  const [l, r] = offsets(points, w0, w1);
  return poly(l) + poly(r);
}
const hemLine = (cx: number, half: number, y: number, sag = 14) =>
  `M${f(cx + half)} ${f(y)}Q${f(cx)} ${f(y + sag)} ${f(cx - half)} ${f(y)}`;

/* ----------------------------------------------------------------- poses */

interface PoseInfo {
  arms: "down" | "hip";
  mirror: boolean;
  zoom: boolean;
}

const POSE_ORDER: Pose[] = ["standing", "hip", "side", "closeup"];

export function poseForVariant(pose: Pose, variant: number): Pose {
  const start = POSE_ORDER.indexOf(pose);
  return POSE_ORDER[(start + variant) % POSE_ORDER.length];
}

function poseInfo(p: Pose): PoseInfo {
  switch (p) {
    case "hip":
      return { arms: "hip", mirror: false, zoom: false };
    case "side":
      return { arms: "down", mirror: true, zoom: false };
    case "closeup":
      return { arms: "hip", mirror: false, zoom: true };
    default:
      return { arms: "down", mirror: false, zoom: false };
  }
}

function placement(p: PoseInfo, variant: number): Matrix {
  if (p.zoom) {
    const s = 2.0;
    return [s, 0, 0, s, OUT_W / 2 - 200 * s + 20, -40];
  }
  const s = 1.06;
  const dx = [0, -30, 40, 20][variant % 4];
  if (p.mirror) {
    const sx = 0.9 * s;
    return [-sx, 0, 0, s, OUT_W / 2 + 200 * sx + dx, 70];
  }
  return [s, 0, 0, s, OUT_W / 2 - 200 * s + dx, 70];
}

/** arm polyline for one side (dir: -1 left, +1 right) */
function armPoints(b: Build, arms: "down" | "hip", dir: number): Pt[] {
  const J: Pt = [b.cx + dir * (b.shW - 12), b.shY + 12];
  if (arms === "hip") {
    const E: Pt = [b.cx + dir * (b.shW + 48), b.waistY - 40];
    const W: Pt = [b.cx + dir * (b.waistW + 10), b.hipY - 18];
    return [J, E, W];
  }
  const E: Pt = [b.cx + dir * (b.shW + 6), b.waistY - 6];
  const W: Pt = [b.cx + dir * (b.shW + 12), b.hipY + 48];
  return [J, E, W];
}

/** point at fraction t (0..2, 1 = elbow) along the arm */
function armAt(pts: Pt[], t: number): Pt[] {
  if (t <= 1) {
    const [a, c] = [pts[0], pts[1]];
    return [a, [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]];
  }
  const u = t - 1;
  const [a, c] = [pts[1], pts[2]];
  return [pts[0], pts[1], [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u]];
}

/* ------------------------------------------------------------- garments */

interface GarmentParts {
  path: PathB;
  /** bottoms drawn under the garment (e.g. pants under a kurta) */
  bottoms?: { kind: "pants" | "legs" | "shorts"; color: string };
  /** extra top drawn over the garment (white t-shirt with pants) */
  overTop?: string;
  details: string; // fold lines etc, in local coords
  /** open path(s) where a border/zari trim is drawn */
  trimD: string;
  showMidriff: boolean;
  coversFeet: boolean;
}

function torsoPath(pb: PathB, b: Build, hemY: number, hemHalf: number, neckDepth: number) {
  const { cx } = b;
  const nw = b.neckW + 12;
  const hipHalf = hemY > b.hipY ? b.hipW + 4 : b.waistW + 4 + ((b.hipW - b.waistW) * (hemY - b.waistY)) / (b.hipY - b.waistY);
  pb.M([cx - nw, b.shY - 6])
    .Q([cx, b.shY - 6 + neckDepth], [cx + nw, b.shY - 6])
    .L([cx + b.shW, b.shY + 4])
    .L([cx + b.shW - 8, b.chestY - 8])
    .Q([cx + b.waistW + 2, b.waistY - 40], [cx + b.waistW + 4, Math.min(b.waistY, hemY)]);
  if (hemY > b.waistY) {
    pb.Q([cx + hipHalf, b.hipY - 30], [cx + Math.max(hipHalf, hemHalf * 0.98), Math.min(hemY, b.hipY)]);
    if (hemY > b.hipY) pb.L([cx + hemHalf, hemY]);
  }
  pb.Q([cx, hemY + 14], [cx - (hemY > b.hipY ? hemHalf : Math.max(hipHalf, hemHalf * 0.98)), hemY]);
  if (hemY > b.hipY) pb.L([cx - Math.max(hipHalf, hemHalf * 0.98), b.hipY]);
  if (hemY > b.waistY) pb.Q([cx - hipHalf, b.hipY - 30], [cx - b.waistW - 4, b.waistY]);
  pb.Q([cx - b.waistW - 2, b.waistY - 40], [cx - b.shW + 8, b.chestY - 8])
    .L([cx - b.shW, b.shY + 4])
    .Z();
}

function sleeves(pb: PathB, b: Build, arms: "down" | "hip", t: number, extra = 12) {
  for (const dir of [-1, 1]) {
    const pts = armAt(armPoints(b, arms, dir), t);
    const shoulder: Pt = [b.cx + dir * (b.shW - 8), b.shY + 2];
    pb.thick([shoulder, ...pts.slice(1)], b.armW + extra + 6, b.armW + extra * 0.6);
  }
}

function pantsPath(pb: PathB, b: Build, ankleOffset = 0) {
  const { cx } = b;
  const a = b.ankleY + ankleOffset;
  pb.M([cx - b.waistW - 4, b.waistY - 4])
    .L([cx + b.waistW + 4, b.waistY - 4])
    .Q([cx + b.hipW + 6, b.hipY - 40], [cx + b.hipW + 4, b.hipY])
    .L([cx + b.hipW - 18, a])
    .L([cx + 10, a])
    .L([cx + 4, b.hipY + 50])
    .L([cx - 4, b.hipY + 50])
    .L([cx - 10, a])
    .L([cx - b.hipW + 18, a])
    .L([cx - b.hipW - 4, b.hipY])
    .Q([cx - b.hipW - 6, b.hipY - 40], [cx - b.waistW - 4, b.waistY - 4])
    .Z();
}

function garmentParts(kindIn: GarmentKind, gender: Gender, b: Build, arms: "down" | "hip"): GarmentParts {
  const male = gender === "man" || gender === "boy";
  const kid = gender === "girl" || gender === "boy";
  let kind = kindIn;
  if (male && (kind === "saree" || kind === "lehenga" || kind === "dress")) kind = "kurta";
  if (kid && kind === "saree") kind = "lehenga";

  const pb = new PathB();
  const { cx } = b;
  const line = (pts: Pt[], o = 0.14, w = 2.2) =>
    `<path d="M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}" fill="none" stroke="#000" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
  let details = "";

  switch (kind) {
    case "saree": {
      torsoPath(pb, b, b.chestY + 42, b.waistW + 10, 38);
      sleeves(pb, b, arms, 0.34, 8);
      // skirt
      pb.M([cx - b.waistW - 6, b.waistY - 8])
        .L([cx + b.waistW + 6, b.waistY - 8])
        .Q([cx + b.hipW + 10, b.hipY - 40], [cx + b.hipW + 6, b.hipY])
        .L([cx + b.hipW + 30, b.ankleY + 18])
        .Q([cx, b.ankleY + 34], [cx - b.hipW - 30, b.ankleY + 18])
        .L([cx - b.hipW - 6, b.hipY])
        .Q([cx - b.hipW - 10, b.hipY - 40], [cx - b.waistW - 6, b.waistY - 8])
        .Z();
      // pallu: diagonal band from right hip to left shoulder, then hanging
      const pallu: Pt[] = [[cx + b.hipW - 6, b.hipY - 10], [cx + 6, b.waistY - 30], [cx - b.shW + 14, b.shY - 2]];
      const tail: Pt[] = [[cx - b.shW + 6, b.shY + 4], [cx - b.shW - 16, b.waistY + 20], [cx - b.shW - 22, b.kneeY - 40]];
      pb.thick(pallu, 92, 66);
      pb.thick(tail, 60, 84);
      const trimD = hemLine(cx, b.hipW + 30, b.ankleY + 18, 16) + bandEdges(pallu, 84, 58) + bandEdges(tail, 52, 76) + hemLine(cx - b.shW - 22, 38, b.kneeY - 40, 4);
      for (let i = 0; i < 6; i++) {
        details += line([[cx + 4 + i * 9, b.hipY + 10], [cx + 6 + i * 14, b.ankleY + 22]], 0.13, 2);
      }
      details += line([[cx + b.hipW - 30, b.hipY + 2], [cx - b.shW + 30, b.shY + 18]], 0.12, 2);
      details += line([[cx - b.shW - 4, b.shY + 30], [cx - b.shW - 18, b.kneeY - 60]], 0.12, 2);
      return { path: pb, details, trimD, showMidriff: true, coversFeet: false, bottoms: { kind: "legs", color: "" } };
    }
    case "lehenga": {
      torsoPath(pb, b, b.chestY + (kid ? 70 : 42), b.waistW + 10, 34);
      sleeves(pb, b, arms, kid ? 0.5 : 0.36, 8);
      pb.M([cx - b.waistW - 6, b.waistY - 8])
        .L([cx + b.waistW + 6, b.waistY - 8])
        .Q([cx + b.hipW + 30, b.hipY - 20], [cx + b.hipW + 70, b.kneeY - 40])
        .L([cx + b.hipW + 140, b.footY + 6])
        .Q([cx, b.footY + 40], [cx - b.hipW - 140, b.footY + 6])
        .L([cx - b.hipW - 70, b.kneeY - 40])
        .Q([cx - b.hipW - 30, b.hipY - 20], [cx - b.waistW - 6, b.waistY - 8])
        .Z();
      let trimD = hemLine(cx, b.hipW + 140, b.footY + 6, 30) + hemLine(cx, b.hipW + 70, b.kneeY - 40 + 70, 22);
      if (!kid) {
        const d1: Pt[] = [[cx + b.waistW + 12, b.waistY + 10], [cx - b.shW + 16, b.shY]];
        const d2: Pt[] = [[cx - b.shW + 6, b.shY + 6], [cx - b.shW - 26, b.hipY + 40], [cx - b.shW - 30, b.kneeY + 40]];
        pb.thick(d1, 54, 40);
        pb.thick(d2, 44, 64);
        trimD += bandEdges(d1, 48, 34) + bandEdges(d2, 38, 58);
      }
      for (let i = -3; i <= 3; i++) {
        details += line([[cx + i * 14, b.waistY + 20], [cx + i * 52, b.footY + 10]], 0.12, 2);
      }
      return { path: pb, details, trimD, showMidriff: !kid, coversFeet: true };
    }
    case "kurta":
    case "other": {
      const hem = kind === "kurta" ? b.kneeY - (kid ? 40 : 10) : b.hipY + 120;
      torsoPath(pb, b, hem, b.hipW + 24, male ? 20 : 30);
      sleeves(pb, b, arms, 1.55, 10);
      details += line([[cx, b.shY + 10], [cx, b.chestY + 30]], 0.25, 2.5);
      details += line([[cx - b.hipW + 10, b.hipY + 30], [cx - b.hipW + 24, hem - 6]], 0.1, 2);
      details += line([[cx + b.hipW - 10, b.hipY + 30], [cx + b.hipW - 24, hem - 6]], 0.1, 2);
      return {
        path: pb,
        details,
        trimD: hemLine(cx, b.hipW + 24, hem) + hemLine(cx, b.neckW + 12, b.shY - 6, male ? 20 : 30),
        showMidriff: false,
        coversFeet: false,
        bottoms: { kind: "pants", color: male ? "#F4F0E6" : "#EFE6D2" },
      };
    }
    case "shirt":
    case "tshirt": {
      const hem = b.hipY + (kind === "shirt" ? 48 : 36);
      torsoPath(pb, b, hem, b.hipW + 6, kind === "shirt" ? 26 : 12);
      sleeves(pb, b, arms, kind === "shirt" && !kid ? 0.55 : 0.42, 10);
      if (kind === "shirt") {
        details += line([[cx - b.neckW - 12, b.shY - 6], [cx - 4, b.shY + 26], [cx - b.neckW - 2, b.shY + 10]], 0.3, 2.5);
        details += line([[cx + b.neckW + 12, b.shY - 6], [cx + 4, b.shY + 26], [cx + b.neckW + 2, b.shY + 10]], 0.3, 2.5);
        details += line([[cx, b.shY + 26], [cx, hem]], 0.2, 2);
        for (let y = b.shY + 50; y < hem - 10; y += 60) details += `<circle cx="${cx + 7}" cy="${y}" r="3.2" fill="#000" fill-opacity=".3"/>`;
      }
      return {
        path: pb,
        details,
        trimD: hemLine(cx, b.hipW + 6, hem),
        showMidriff: false,
        coversFeet: false,
        bottoms: kid && !male ? { kind: "legs", color: "" } : { kind: "pants", color: kind === "shirt" ? "#2B3350" : "#3E5D8F" },
      };
    }
    case "dress": {
      const hem = b.kneeY - (kid ? 10 : 30);
      torsoPath(pb, b, hem, b.hipW + 64, 30);
      sleeves(pb, b, arms, 0.3, 8);
      details += line([[cx - b.waistW - 2, b.waistY], [cx + b.waistW + 2, b.waistY]], 0.22, 3);
      for (let i = -2; i <= 2; i++) details += line([[cx + i * 14, b.waistY + 20], [cx + i * 40, hem - 4]], 0.1, 2);
      return { path: pb, details, trimD: hemLine(cx, b.hipW + 64, hem), showMidriff: false, coversFeet: false, bottoms: { kind: "legs", color: "" } };
    }
    case "pants": {
      pantsPath(pb, b, 10);
      details += line([[cx, b.hipY + 60], [cx, b.waistY]], 0.12, 2);
      return {
        path: pb,
        details,
        trimD: "",
        showMidriff: false,
        coversFeet: false,
        overTop: male ? "#FAFAF7" : "#FBF3E6",
      };
    }
  }
}

/* --------------------------------------------------------------- fabrics */

export function fabricDefs(id: string, fab: Fabric, seed = 7): string {
  const { base, accent, pattern } = fab;
  const r = rng(seed);
  let cell = 40;
  let inner = `<rect width="100%" height="100%" fill="${base}"/>`;
  switch (pattern) {
    case "buti":
      cell = 46;
      inner += `<g fill="${accent}"><circle cx="11" cy="11" r="3.6"/><path d="M11 3c2 3 2 5 0 8-2-3-2-5 0-8z"/><circle cx="34" cy="34" r="3.6"/><path d="M34 26c2 3 2 5 0 8-2-3-2-5 0-8z"/></g>`;
      break;
    case "checks":
      cell = 44;
      inner += `<g fill="${accent}" fill-opacity=".55"><rect x="0" y="0" width="44" height="9"/><rect x="0" y="0" width="9" height="44"/></g><g fill="${shade(base, 0.6)}" fill-opacity=".45"><rect x="26" y="0" width="3" height="44"/><rect x="0" y="26" width="44" height="3"/></g>`;
      break;
    case "stripes":
      cell = 30;
      inner += `<rect x="0" y="0" width="8" height="30" fill="${accent}" fill-opacity=".85"/><rect x="16" y="0" width="2" height="30" fill="${accent}" fill-opacity=".6"/>`;
      break;
    case "floral": {
      cell = 70;
      const petals = (x: number, y: number, s: number, c: string) =>
        [0, 72, 144, 216, 288].map((a) => `<ellipse cx="${x}" cy="${y - 6 * s}" rx="${3.6 * s}" ry="${6.5 * s}" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join("") +
        `<circle cx="${x}" cy="${y}" r="${2.6 * s}" fill="${shade(accent, -0.3)}"/>`;
      inner += petals(18, 20, 1.3, accent) + petals(52, 54, 1, shade(accent, 0.35));
      inner += `<path d="M30 40q6-6 12-2M6 58q8-4 10 4" stroke="${shade(base, -0.25)}" stroke-width="2" fill="none"/>`;
      break;
    }
    case "zigzag":
      cell = 36;
      inner += `<path d="M0 12l9-9 9 9 9-9 9 9" stroke="${accent}" stroke-width="3" fill="none"/><circle cx="18" cy="28" r="2.6" fill="${accent}"/>`;
      break;
    case "polka":
      cell = 34;
      inner += `<circle cx="8" cy="8" r="5" fill="${accent}"/><circle cx="25" cy="25" r="5" fill="${accent}"/>`;
      break;
    case "chikan": {
      cell = 40;
      let dots = "";
      for (let i = 0; i < 6; i++) dots += `<circle cx="${f(r() * 40)}" cy="${f(r() * 40)}" r="1.6"/>`;
      inner += `<g fill="${accent}" fill-opacity=".8">${dots}<path d="M20 12c3 4 3 6 0 10-3-4-3-6 0-10z"/></g>`;
      break;
    }
    default:
      inner += `<rect width="100%" height="100%" fill="${base}"/>`;
  }
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${cell}" height="${cell}">${inner}</pattern>`;
}

/* -------------------------------------------------------------- the body */

function hairColor(age: AgeGroup) {
  return age === "senior" ? "#8E8C8A" : "#1E1713";
}

function bodyUnder(b: Build, o: SceneOptions, gp: GarmentParts, arms: "down" | "hip"): string {
  const skin = SKIN[o.skin];
  const skinD = shade(skin, -0.14);
  const fem = o.gender === "woman" || o.gender === "girl";
  const { cx } = b;
  let s = "";
  // ground shadow
  s += `<ellipse cx="${cx}" cy="${b.footY + 6}" rx="${b.hipW + (gp.coversFeet ? 150 : 50)}" ry="16" fill="#000" fill-opacity=".22" filter="url(#ds-blur6)"/>`;
  // long hair behind
  if (fem) {
    const hc = hairColor(o.age);
    s += `<path d="M${cx - b.headR - 4} ${b.headY}Q${cx - b.headR - 14} ${b.shY + 70} ${cx - 30} ${b.chestY + 10}L${cx + 30} ${b.chestY + 10}Q${cx + b.headR + 14} ${b.shY + 70} ${cx + b.headR + 4} ${b.headY}Z" fill="${hc}"/>`;
  }
  // legs + feet
  const legColor = skin;
  const feet = `<ellipse cx="${cx - 26}" cy="${b.footY - 6}" rx="22" ry="10" fill="#3A2A22"/><ellipse cx="${cx + 26}" cy="${b.footY - 6}" rx="22" ry="10" fill="#3A2A22"/>`;
  if (!gp.coversFeet) {
    s += `<path d="M${cx - 50} ${b.hipY}L${cx - 4} ${b.hipY}L${cx - 14} ${b.ankleY}L${cx - 34} ${b.ankleY}Z" fill="${legColor}"/>`;
    s += `<path d="M${cx + 50} ${b.hipY}L${cx + 4} ${b.hipY}L${cx + 14} ${b.ankleY}L${cx + 34} ${b.ankleY}Z" fill="${skinD}"/>`;
    s += `<path d="M${cx - 34} ${b.ankleY - 4}L${cx - 14} ${b.ankleY - 4}L${cx - 10} ${b.footY - 6}L${cx - 44} ${b.footY - 6}Z" fill="${legColor}"/>`;
    s += `<path d="M${cx + 34} ${b.ankleY - 4}L${cx + 14} ${b.ankleY - 4}L${cx + 10} ${b.footY - 6}L${cx + 44} ${b.footY - 6}Z" fill="${skinD}"/>`;
    s += feet;
  }
  if (gp.bottoms?.kind === "pants") {
    const p = new PathB();
    pantsPath(p, b);
    s += `<path d="${p.d}" fill="${gp.bottoms.color}"/><path d="${p.d}" fill="url(#ds-shadeH)"/>`;
  }
  // torso skin (visible as midriff for saree / lehenga)
  s += `<path d="M${cx - b.shW + 10} ${b.shY}L${cx + b.shW - 10} ${b.shY}L${cx + b.waistW + 2} ${b.waistY + 10}L${cx - b.waistW - 2} ${b.waistY + 10}Z" fill="${gp.showMidriff ? skin : skinD}"/>`;
  // neck
  s += `<rect x="${cx - b.neckW}" y="${b.headY + b.headR * 0.6}" width="${b.neckW * 2}" height="${b.neckBot - b.headY - b.headR * 0.6 + 18}" rx="${b.neckW * 0.8}" fill="${skinD}"/>`;
  // arms
  for (const dir of [-1, 1]) {
    const pts = armPoints(b, arms, dir);
    s += `<path d="M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}" fill="none" stroke="${dir < 0 ? skin : skinD}" stroke-width="${b.armW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return s;
}

function bodyOver(b: Build, o: SceneOptions, gp: GarmentParts, arms: "down" | "hip", garmentD: string): string {
  const skin = SKIN[o.skin];
  const fem = o.gender === "woman" || o.gender === "girl";
  const hc = hairColor(o.age);
  const { cx } = b;
  let s = "";
  // shading on garment (gives volume to flat fabric / photos)
  s += `<path d="${garmentD}" fill="url(#ds-shadeH)"/>`;
  s += `<path d="${garmentD}" fill="url(#ds-shadeV)"/>`;
  if (o.fabric?.trim) {
    s += `<path d="${gp.trimD}" fill="none" stroke="${o.fabric.trim}" stroke-width="10" stroke-linecap="round"/>`;
    s += `<path d="${gp.trimD}" fill="none" stroke="${shade(o.fabric.trim, -0.35)}" stroke-width="2" stroke-dasharray="2 6"/>`;
  }
  s += gp.details;
  if (gp.overTop) {
    const t = new PathB();
    torsoPath(t, b, b.waistY + 30, b.waistW + 12, 12);
    sleeves(t, b, arms, 0.4, 10);
    s += `<path d="${t.d}" fill="${gp.overTop}"/><path d="${t.d}" fill="url(#ds-shadeH)"/>`;
  }
  // hands
  for (const dir of [-1, 1]) {
    const pts = armPoints(b, arms, dir);
    const w = pts[2];
    s += `<ellipse cx="${f(w[0])}" cy="${f(w[1] + 6)}" rx="${b.armW * 0.55}" ry="${b.armW * 0.7}" fill="${skin}"/>`;
    if (fem) s += `<ellipse cx="${f(w[0])}" cy="${f(w[1] - 10)}" rx="${b.armW * 0.55}" ry="3" fill="none" stroke="#D4A62A" stroke-width="3"/>`;
  }
  // head
  const hy = b.headY;
  const r = b.headR;
  s += `<ellipse cx="${cx - r * 0.95}" cy="${hy + 6}" rx="${r * 0.16}" ry="${r * 0.24}" fill="${shade(skin, -0.08)}"/>`;
  s += `<ellipse cx="${cx + r * 0.95}" cy="${hy + 6}" rx="${r * 0.16}" ry="${r * 0.24}" fill="${shade(skin, -0.08)}"/>`;
  s += `<ellipse cx="${cx}" cy="${hy}" rx="${r * 0.86}" ry="${r}" fill="${skin}"/>`;
  s += `<ellipse cx="${cx + r * 0.25}" cy="${hy + r * 0.2}" rx="${r * 0.6}" ry="${r * 0.75}" fill="#000" fill-opacity=".06"/>`;
  if (fem) {
    s += `<path d="M${cx - r * 0.92} ${hy + r * 0.25}Q${cx - r * 1.05} ${hy - r * 1.25} ${cx} ${hy - r * 1.08}Q${cx + r * 1.05} ${hy - r * 1.25} ${cx + r * 0.92} ${hy + r * 0.25}Q${cx + r * 0.7} ${hy - r * 0.55} ${cx + 2} ${hy - r * 0.72}Q${cx - r * 0.7} ${hy - r * 0.55} ${cx - r * 0.92} ${hy + r * 0.25}Z" fill="${hc}"/>`;
    // bun
    s += `<circle cx="${cx}" cy="${hy - r * 1.05}" r="${r * 0.34}" fill="${hc}"/>`;
    if (o.gender === "woman") s += `<circle cx="${cx}" cy="${hy - r * 0.38}" r="${r * 0.07}" fill="#B91C1C"/>`;
    s += `<circle cx="${cx - r * 0.95}" cy="${hy + r * 0.42}" r="${r * 0.11}" fill="#D4A62A"/><circle cx="${cx + r * 0.95}" cy="${hy + r * 0.42}" r="${r * 0.11}" fill="#D4A62A"/>`;
  } else {
    s += `<path d="M${cx - r * 0.9} ${hy - r * 0.05}Q${cx - r * 1.0} ${hy - r * 1.2} ${cx + r * 0.1} ${hy - r * 1.08}Q${cx + r * 1.0} ${hy - r * 1.05} ${cx + r * 0.9} ${hy - r * 0.05}Q${cx + r * 0.75} ${hy - r * 0.62} ${cx} ${hy - r * 0.66}Q${cx - r * 0.75} ${hy - r * 0.6} ${cx - r * 0.9} ${hy - r * 0.05}Z" fill="${hc}"/>`;
    if (o.gender === "man" && o.age !== "young") {
      s += `<path d="M${cx - r * 0.62} ${hy + r * 0.45}Q${cx} ${hy + r * 1.22} ${cx + r * 0.62} ${hy + r * 0.45}Q${cx} ${hy + r * 0.85} ${cx - r * 0.62} ${hy + r * 0.45}Z" fill="${hc}" fill-opacity=".55"/>`;
    }
  }
  return s;
}

/* ---------------------------------------------------------- backgrounds */

export function backgroundSvg(bg: BackgroundId, variant = 0): string {
  const W = OUT_W;
  const H = OUT_H;
  const r = rng(101 + variant * 17 + bg.length * 3);
  const floorY = 930;
  switch (bg) {
    case "white":
      return `<rect width="${W}" height="${H}" fill="#FAFAF8"/><rect y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#ds-floorWhite)"/>`;
    case "studio":
      return `<rect width="${W}" height="${H}" fill="url(#ds-studio)"/><rect y="${floorY}" width="${W}" height="${H - floorY}" fill="#000" fill-opacity=".08"/>`;
    case "wedding": {
      let s = `<rect width="${W}" height="${H}" fill="#6E1423"/><rect width="${W}" height="${H}" fill="url(#ds-warmGlow)"/>`;
      // mandap arch
      s += `<g filter="url(#ds-blur3)"><path d="M120 ${floorY}V380Q450 40 780 380V${floorY}H720V400Q450 120 180 400V${floorY}Z" fill="#E3B23C"/>`;
      s += `<rect x="96" y="360" width="56" height="${floorY - 360}" fill="#C9962B"/><rect x="748" y="360" width="56" height="${floorY - 360}" fill="#C9962B"/>`;
      // garlands
      for (let g = 0; g < 9; g++) {
        const x = 40 + g * 102;
        const len = 220 + r() * 160;
        for (let y = 0; y < len; y += 22) s += `<circle cx="${x}" cy="${y}" r="12" fill="${y % 44 ? "#F59E0B" : "#FACC15"}"/>`;
        s += `<circle cx="${x}" cy="${len + 14}" r="9" fill="#DC2626"/>`;
      }
      s += `<path d="M0 30Q450 170 900 30" stroke="#F97316" stroke-width="26" fill="none" stroke-dasharray="1 20" stroke-linecap="round"/></g>`;
      s += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="#4A0D18"/>`;
      s += `<ellipse cx="450" cy="${floorY + 90}" rx="300" ry="50" fill="none" stroke="#FDE68A" stroke-opacity=".45" stroke-width="6" stroke-dasharray="14 10"/>`;
      return s;
    }
    case "street": {
      let s = `<rect width="${W}" height="${H}" fill="url(#ds-sky)"/><g filter="url(#ds-blur4)">`;
      const cols = ["#F2C6A0", "#9FD3C7", "#F7E3A1", "#E8A0A0", "#B8C4E8", "#F0B67F"];
      let x = -20;
      let i = 0;
      while (x < W) {
        const w = 120 + r() * 90;
        const h = 380 + r() * 300;
        const c = cols[i++ % cols.length];
        s += `<rect x="${f(x)}" y="${f(floorY - h)}" width="${f(w)}" height="${f(h)}" fill="${c}"/>`;
        for (let wy = floorY - h + 40; wy < floorY - 90; wy += 80)
          for (let wx = x + 20; wx < x + w - 30; wx += 46) s += `<rect x="${f(wx)}" y="${f(wy)}" width="24" height="36" rx="4" fill="#5B6B7F" fill-opacity=".55"/>`;
        s += `<rect x="${f(x)}" y="${f(floorY - h)}" width="${f(w)}" height="14" fill="#000" fill-opacity=".1"/>`;
        x += w + 6;
      }
      s += `<rect x="0" y="${floorY - 150}" width="${W}" height="10" fill="#fff" fill-opacity=".5"/>`;
      s += `<circle cx="760" cy="200" r="90" fill="#fff" fill-opacity=".5"/></g>`;
      s += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="#9A8F84"/><rect y="${floorY}" width="${W}" height="8" fill="#000" fill-opacity=".12"/>`;
      return s;
    }
    case "festive": {
      let s = `<rect width="${W}" height="${H}" fill="url(#ds-night)"/><g filter="url(#ds-blur6)">`;
      const cols = ["#FDE047", "#FB923C", "#F472B6", "#FACC15", "#FFF7D6"];
      for (let i = 0; i < 60; i++) {
        s += `<circle cx="${f(r() * W)}" cy="${f(r() * 760)}" r="${f(8 + r() * 26)}" fill="${cols[i % cols.length]}" fill-opacity="${f(0.25 + r() * 0.45)}"/>`;
      }
      s += `</g>`;
      for (let k = 0; k < 2; k++) {
        const y0 = 80 + k * 140;
        s += `<path d="M0 ${y0}Q450 ${y0 + 120} 900 ${y0}" stroke="#2A1F4F" stroke-width="2" fill="none"/>`;
        for (let i = 0; i <= 18; i++) {
          const t = i / 18;
          const xx = t * 900;
          const yy = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + 120) + t * t * y0;
          s += `<circle cx="${f(xx)}" cy="${f(yy + 8)}" r="6" fill="${cols[(i + k) % cols.length]}"/>`;
        }
      }
      s += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="#2A1A3E"/>`;
      for (let i = 0; i < 9; i++) {
        const xx = 50 + i * 100;
        const yy = floorY + 60 + (i % 2) * 40;
        s += `<ellipse cx="${xx}" cy="${yy}" rx="30" ry="12" fill="#B45309"/><path d="M${xx - 30} ${yy}Q${xx} ${yy + 30} ${xx + 30} ${yy}Z" fill="#92400E"/>`;
        s += `<ellipse cx="${xx}" cy="${yy - 22}" rx="8" ry="18" fill="#FDBA74" filter="url(#ds-blur3)"/><ellipse cx="${xx}" cy="${yy - 18}" rx="4" ry="10" fill="#FFF7D6"/>`;
      }
      return s;
    }
    case "shop": {
      let s = `<rect width="${W}" height="${H}" fill="#8B5E3C"/><rect width="${W}" height="${H}" fill="url(#ds-warmGlow)"/><g filter="url(#ds-blur4)">`;
      const cloth = ["#B91C1C", "#1D4ED8", "#15803D", "#CA8A04", "#9D174D", "#0F766E", "#7C3AED", "#EA580C", "#F5F5F4"];
      for (let row = 0; row < 4; row++) {
        const y = 120 + row * 200;
        s += `<rect x="0" y="${y + 150}" width="${W}" height="22" fill="#5C3A21"/>`;
        let x = 20;
        while (x < W - 40) {
          const w = 70 + r() * 40;
          let yy = y + 150;
          const n = 3 + Math.floor(r() * 4);
          for (let k = 0; k < n; k++) {
            yy -= 24;
            s += `<rect x="${f(x)}" y="${f(yy)}" width="${f(w)}" height="22" rx="4" fill="${cloth[Math.floor(r() * cloth.length)]}"/>`;
          }
          x += w + 14;
        }
      }
      s += `</g><rect y="${floorY}" width="${W}" height="${H - floorY}" fill="#6B4428"/><rect y="${floorY}" width="${W}" height="10" fill="#000" fill-opacity=".15"/>`;
      return s;
    }
  }
}

const COMMON_DEFS = `
<filter id="ds-blur3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="ds-blur4" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="ds-blur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
<linearGradient id="ds-floorWhite" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDEDEA"/><stop offset="1" stop-color="#F7F7F5"/></linearGradient>
<radialGradient id="ds-studio" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#E4E5E7"/><stop offset="1" stop-color="#8F9298"/></radialGradient>
<radialGradient id="ds-warmGlow" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#FFD58A" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
<linearGradient id="ds-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC9F0"/><stop offset="1" stop-color="#F3E6D3"/></linearGradient>
<linearGradient id="ds-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E1B4B"/><stop offset="1" stop-color="#4C1D95"/></linearGradient>
<linearGradient id="ds-shadeH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
<linearGradient id="ds-shadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
`;

/* ----------------------------------------------------------- public API */

export interface SceneLayers {
  width: number;
  height: number;
  /** full SVG documents (no external refs → safe to draw on a canvas) */
  backgroundDoc: string;
  underDoc: string;
  overDoc: string;
  /** garment outline in figure space + the matrix that maps it to the output */
  garmentPath: string;
  garmentBox: { x: number; y: number; w: number; h: number };
  matrix: Matrix;
  /** everything in one document (used when a fabric pattern is supplied) */
  fullDoc: string;
}

const doc = (inner: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${OUT_W} ${OUT_H}"><defs>${COMMON_DEFS}${defs}</defs>${inner}</svg>`;

export function buildScene(o: SceneOptions): SceneLayers {
  const variant = o.variant ?? 0;
  const p = poseInfo(o.pose);
  const b = BUILDS[o.gender];
  const gp = garmentParts(o.garment, o.gender, b, p.arms);
  const m = placement(p, variant);
  const mt = `matrix(${m.map(f).join(" ")})`;
  const under = bodyUnder(b, o, gp, p.arms);
  const over = bodyOver(b, o, gp, p.arms, gp.path.d);
  const bg = backgroundSvg(o.background, variant);
  const fabricDef = o.fabric ? fabricDefs("ds-fabric", o.fabric, 11) : "";
  const garmentFill = o.fabric ? "url(#ds-fabric)" : "#999";
  return {
    width: OUT_W,
    height: OUT_H,
    backgroundDoc: doc(bg),
    underDoc: doc(`<g transform="${mt}">${under}</g>`),
    overDoc: doc(`<g transform="${mt}">${over}</g>`),
    garmentPath: gp.path.d,
    garmentBox: gp.path.bbox,
    matrix: m,
    fullDoc: doc(`${bg}<g transform="${mt}">${under}<path d="${gp.path.d}" fill="${garmentFill}"/>${over}</g>`, fabricDef),
  };
}

/** The "input photo" for a sample garment: the item laid on a wooden counter. */
export function flatLayDoc(kind: GarmentKind, fabric: Fabric, kid = false): string {
  const W = OUT_W;
  const H = OUT_H;
  let s = `<rect width="${W}" height="${H}" fill="#C79A6B"/>`;
  const r = rng(5);
  for (let i = 0; i < 40; i++) {
    const y = r() * H;
    s += `<path d="M0 ${f(y)}Q${f(W / 2)} ${f(y + (r() - 0.5) * 60)} ${W} ${f(y + (r() - 0.5) * 30)}" stroke="#A97C50" stroke-opacity=".5" stroke-width="${f(1 + r() * 3)}" fill="none"/>`;
  }
  const defs = fabricDefs("ds-fabric", fabric, 3);
  const trim = fabric.trim ? `stroke="${fabric.trim}" stroke-width="14"` : "";
  if (kind === "saree" || kind === "lehenga") {
    // folded stack
    for (let k = 0; k < 3; k++) {
      const x = 150 + k * 18;
      const y = 300 + k * 90;
      s += `<rect x="${x + 10}" y="${y + 14}" width="580" height="360" rx="14" fill="#000" fill-opacity=".18" filter="url(#ds-blur6)"/>`;
      s += `<rect x="${x}" y="${y}" width="580" height="360" rx="14" fill="url(#ds-fabric)" ${trim}/>`;
      s += `<rect x="${x}" y="${y}" width="580" height="360" rx="14" fill="url(#ds-shadeV)"/>`;
    }
    return doc(s, defs);
  }
  const g: Gender = kid ? (kind === "dress" ? "girl" : "boy") : kind === "dress" ? "woman" : "man";
  const b = BUILDS[g];
  const gp = garmentParts(kind, g, b, "down");
  const sc = 1.25;
  const box = gp.path.bbox;
  const tx = W / 2 - (box.x + box.w / 2) * sc;
  const ty = H / 2 - (box.y + box.h / 2) * sc;
  s += `<g transform="matrix(${sc} 0 0 ${sc} ${f(tx)} ${f(ty)})">`;
  s += `<path d="${gp.path.d}" transform="translate(8 12)" fill="#000" fill-opacity=".22" filter="url(#ds-blur6)"/>`;
  s += `<path d="${gp.path.d}" fill="url(#ds-fabric)"/>`;
  if (fabric.trim) s += `<path d="${gp.trimD}" fill="none" stroke="${fabric.trim}" stroke-width="9" stroke-linecap="round"/>`;
  s += `<path d="${gp.path.d}" fill="url(#ds-shadeH)"/>${gp.details}`;
  // hanger
  s += `<path d="M${b.cx - b.shW - 10} ${b.shY + 6}L${b.cx} ${b.shY - 40}L${b.cx + b.shW + 10} ${b.shY + 6}" stroke="#4B3621" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${b.cx} ${b.shY - 40}V${b.shY - 66}Q${b.cx + 22} ${b.shY - 80} ${b.cx + 16} ${b.shY - 96}" stroke="#9CA3AF" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += `</g>`;
  return doc(s, defs);
}
