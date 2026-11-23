"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_LOOK, type LookOptions } from "../types";
import type { GarmentChoice } from "./jobs";

interface CreateState {
  garment: GarmentChoice | null;
  look: LookOptions;
  /** true once the user touched a chip — Quick Pick won't override their choice */
  lookTouched: boolean;
  setGarment: (g: GarmentChoice | null) => void;
  setLook: (patch: Partial<LookOptions>, touched?: boolean) => void;
  reset: () => void;
}

/** State for the 3-step flow (Capture → Look → Results). Survives a page reload. */
export const useCreateStore = create<CreateState>()(
  persist(
    (set) => ({
      garment: null,
      look: DEFAULT_LOOK,
      lookTouched: false,
      setGarment: (garment) => set({ garment, lookTouched: false }),
      setLook: (patch, touched = true) => set((s) => ({ look: { ...s.look, ...patch }, lookTouched: s.lookTouched || touched })),
      reset: () => set({ garment: null, look: DEFAULT_LOOK, lookTouched: false }),
    }),
    { name: "ds-create", storage: createJSONStorage(() => sessionStorage) },
  ),
);
