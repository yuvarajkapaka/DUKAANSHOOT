import type { AgeGroup, BackgroundId, Gender, GarmentType, Pose, SkinTone } from "./types";

/** A "render:" URL describes a demo photo that the browser draws itself (see lib/client/render.ts). */
export interface RenderSpec {
  garment: GarmentType;
  gender: Gender;
  age: AgeGroup;
  skin: SkinTone;
  pose: Pose;
  background: BackgroundId;
  variant: number;
}

export const RENDER_PREFIX = "render:";

export function encodeRenderUrl(spec: RenderSpec): string {
  return RENDER_PREFIX + encodeURIComponent(JSON.stringify(spec));
}

export function decodeRenderUrl(url: string): RenderSpec | null {
  if (!url.startsWith(RENDER_PREFIX)) return null;
  try {
    return JSON.parse(decodeURIComponent(url.slice(RENDER_PREFIX.length))) as RenderSpec;
  } catch {
    return null;
  }
}
