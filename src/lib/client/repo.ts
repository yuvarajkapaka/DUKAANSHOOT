import type { GarmentType, Generation, GenerationSource, LookOptions, Payment, Profile } from "../types";

/** A stored image: either a public path (pre-made sample) or a Blob saved in storage. */
export interface NewImage {
  src?: string;
  blob?: Blob;
}

export interface NewGeneration {
  garmentType: GarmentType;
  look: LookOptions;
  source: GenerationSource;
  jobId: string;
  /** cloud: the id the server created atomically with the credit deduction */
  serverId?: string | null;
  creditsUsed: number;
  garmentThumb?: string;
}

/**
 * Everything the UI needs from storage. Two implementations:
 *  - LocalRepo  : IndexedDB on the device ("Try Demo" — zero setup, works offline)
 *  - CloudRepo  : Supabase Postgres + Storage (Google / email login)
 */
export interface Repo {
  readonly kind: "local" | "cloud";
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Pick<Profile, "shopName" | "shopType" | "phone" | "language" | "defaults" | "role" | "name" | "city">>): Promise<Profile>;

  /** local only: spend credits before a job (cloud spends them on the server, atomically) */
  spendCredits(n: number): Promise<number>;
  /** local only: add VERIFIED credits / refunds */
  addCredits(n: number): Promise<number>;

  saveUpload(blob: Blob, garmentType: GarmentType): Promise<{ uploadId: string }>;
  getUploadBlob(uploadId: string): Promise<Blob | null>;

  createGeneration(g: NewGeneration): Promise<Generation>;
  getGeneration(id: string): Promise<Generation | null>;
  listGenerations(limit?: number): Promise<Generation[]>;
  updateGeneration(id: string, patch: Partial<Pick<Generation, "status" | "jobId" | "error" | "note">>): Promise<void>;
  addImages(id: string, images: NewImage[]): Promise<void>;
  deleteImage(generationId: string, imageId: string): Promise<void>;
  /** blob for download / share / zip */
  getImageBlob(generationId: string, imageId: string): Promise<Blob | null>;

  listPayments(): Promise<Payment[]>;
  recordPayment(p: Payment): Promise<void>;

  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}
