import "server-only";
import { env } from "../server/env";
import { FashnProvider } from "./fashn";
import { MockProvider } from "./mock";
import type { TryOnInput, TryOnProvider, TryOnStatus } from "./types";

export const mockProvider = new MockProvider();

/**
 * Real AI with a safety net for demos: if the real provider is out of credits,
 * rate-limited, down, or a job fails, we switch to the MockProvider so a live
 * presentation never breaks. (Disable with DEMO_MODE=false.)
 */
class FallbackProvider implements TryOnProvider {
  readonly name: string;
  constructor(
    private readonly real: TryOnProvider,
    private readonly fallbackEnabled: boolean,
  ) {
    this.name = real.name;
  }

  async generate(input: TryOnInput) {
    // pre-made demo garments never need paid AI
    if (input.sampleId) return mockProvider.generate(input);
    try {
      return await this.real.generate(input);
    } catch (e) {
      if (!this.fallbackEnabled) throw e;
      console.warn("[tryon] real provider failed, using demo photos:", (e as Error).message);
      return mockProvider.generate({ ...input, count: input.count }, "fallback");
    }
  }

  async getStatus(jobId: string): Promise<TryOnStatus> {
    if (jobId.startsWith("mock.")) return mockProvider.getStatus(jobId);
    try {
      const s = await this.real.getStatus(jobId);
      if (s.status !== "failed" || !this.fallbackEnabled) return s;
      console.warn("[tryon] real job failed, using demo photos:", s.error);
    } catch (e) {
      if (!this.fallbackEnabled) throw e;
      console.warn("[tryon] status check failed, using demo photos:", (e as Error).message);
    }
    // tell the route to restart this job on the mock provider
    return { status: "failed", error: "FALLBACK" };
  }
}

let cached: TryOnProvider | null = null;

export function getProvider(): TryOnProvider {
  if (!cached) {
    cached = env.provider === "real" ? new FallbackProvider(new FashnProvider(env.fashnKey), env.demoMode) : mockProvider;
  }
  return cached;
}
