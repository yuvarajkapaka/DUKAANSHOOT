"use client";
import { LazyMotion, MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { addDeviceRole, clearDeviceUser, getDeviceUser, setDeviceUser } from "@/lib/client/device-session";
import { LocalRepo } from "@/lib/client/local-repo";
import type { Repo } from "@/lib/client/repo";
import { LocalMarket } from "@/lib/market/local-market";
import type { MarketStore, Role } from "@/lib/market/types";
import type { Profile, PublicAppConfig } from "@/lib/types";
import { MarketStateProvider } from "./market-state";

/* ------------------------------------------------------------------ config */
const ConfigCtx = createContext<PublicAppConfig | null>(null);
export function useAppConfig() {
  const c = useContext(ConfigCtx);
  if (!c) throw new Error("ConfigCtx missing");
  return c;
}

/* ----------------------------------------------------------------- session */
interface Session {
  status: "loading" | "guest" | "ready";
  repo: Repo | null;
  profile: Profile | null;
  market: MarketStore;
  setProfile: (p: Profile) => void;
  refreshProfile: () => Promise<Profile | null>;
  /** instant demo login ("Demo as Seller" / "Demo as Buyer") */
  startDemo: (role: Role, language: string) => Promise<Profile>;
  /** new account kept on this phone (used when Supabase isn't set up) */
  createDeviceAccount: (role: Role, language: string) => Promise<Profile>;
  /** pick or switch role ("Start selling") */
  setRole: (role: Role) => Promise<Profile | null>;
  signOut: () => Promise<void>;
}
const SessionCtx = createContext<Session | null>(null);
export function useSession() {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("SessionCtx missing");
  return s;
}
/** For screens behind a login guard: repo + profile are always set. */
export function useAuthed() {
  return useSession() as Session & { repo: Repo; profile: Profile };
}

const loadMotionFeatures = () => import("@/lib/motion-features").then((m) => m.default);
const localMarket = new LocalMarket();
let cloudMarket: MarketStore | null = null;

export function Providers({ config, children }: { config: PublicAppConfig; children: React.ReactNode }) {
  const [status, setStatus] = useState<Session["status"]>("loading");
  const [repo, setRepo] = useState<Repo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [market, setMarket] = useState<MarketStore>(localMarket);
  const router = useRouter();

  const resolve = useCallback(async () => {
    // Supabase code is only downloaded when it's configured — demo mode stays light on 3G
    if (config.supabase) {
      const [{ supabaseBrowser }, { CloudMarket }] = await Promise.all([import("@/lib/supabase/browser"), import("@/lib/market/cloud-market")]);
      const sb = supabaseBrowser();
      if (sb) {
        cloudMarket ??= new CloudMarket(sb);
        const { data } = await sb.auth.getSession();
        const user = data.session?.user;
        if (user) {
          setMarket(cloudMarket);
          const { CloudRepo } = await import("@/lib/client/cloud-repo");
          const r = new CloudRepo(sb, user.id, user.email ?? null);
          const p = await r.getProfile().catch(() => null);
          if (p) {
            setRepo(r);
            setProfile(p);
            setStatus("ready");
            return;
          }
        }
      }
    }
    const id = getDeviceUser();
    const local = id ? new LocalRepo(id) : null;
    const p = local ? await local.getProfile().catch(() => null) : null;
    if (local && p) {
      // on-device demo account → on-device marketplace
      setMarket(localMarket);
      setRepo(local);
      setProfile(p);
      setStatus("ready");
    } else {
      setMarket(cloudMarket ?? localMarket);
      setRepo(null);
      setProfile(null);
      setStatus("guest");
    }
  }, [config.supabase]);

  useEffect(() => {
    void resolve();
    if (!config.supabase) return;
    let unsub = () => {};
    let alive = true;
    void import("@/lib/supabase/browser").then(({ supabaseBrowser }) => {
      const sb = supabaseBrowser();
      if (!sb || !alive) return;
      const { data } = sb.auth.onAuthStateChange((evt) => {
        if (evt === "SIGNED_IN" || evt === "SIGNED_OUT") void resolve();
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [resolve, config.supabase]);

  const value = useMemo<Session>(() => {
    const adoptLocal = (p: Profile) => {
      setDeviceUser(p.id, p.role);
      setRepo(new LocalRepo(p.id));
      setProfile(p);
      setStatus("ready");
      return p;
    };
    return {
      status,
      repo,
      profile,
      market,
      setProfile,
      refreshProfile: async () => {
        if (!repo) return null;
        const p = await repo.getProfile();
        if (p) setProfile(p);
        return p;
      },
      startDemo: async (role, language) => {
        if (config.supabase) {
          // a cloud deployment has real demo accounts (see scripts/seed-supabase.mjs)
          const res = await fetch("/api/demo-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
          if (res.ok) {
            await resolve();
            const { supabaseBrowser } = await import("@/lib/supabase/browser");
            await supabaseBrowser()?.auth.refreshSession();
            const { CloudRepo } = await import("@/lib/client/cloud-repo");
            const sb = supabaseBrowser()!;
            const { data } = await sb.auth.getUser();
            const r = new CloudRepo(sb, data.user!.id, data.user!.email ?? null);
            const p = (await r.getProfile())!;
            setRepo(r);
            setProfile(p);
            setStatus("ready");
            return p;
          }
        }
        setMarket(localMarket);
        return adoptLocal(await LocalRepo.startDemo(role, language));
      },
      createDeviceAccount: async (role, language) => {
        setMarket(localMarket);
        return adoptLocal(await LocalRepo.createAccount(role, language));
      },
      setRole: async (role) => {
        if (!repo || !profile) return null;
        const p = await repo.updateProfile({ role });
        if (repo.kind === "local") addDeviceRole(role);
        setProfile(p);
        return p;
      },
      signOut: async () => {
        await repo?.signOut();
        if (repo?.kind !== "cloud") clearDeviceUser(profile?.role ?? null);
        setRepo(null);
        setProfile(null);
        setStatus("guest");
        router.replace("/market");
      },
    };
  }, [status, repo, profile, market, router, config.supabase, resolve]);

  return (
    <ConfigCtx.Provider value={config}>
      <SessionCtx.Provider value={value}>
        {/* animation engine loads after first paint; components use the tiny `m` core */}
        <LazyMotion features={loadMotionFeatures}>
          <MotionConfig reducedMotion="user">
            <MarketStateProvider>{children}</MarketStateProvider>
          </MotionConfig>
        </LazyMotion>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontSize: 16, borderRadius: 16, padding: "14px 16px", fontFamily: "inherit" },
            classNames: { toast: "!bg-night !text-white !border-0 !shadow-warm", description: "!text-white/80", icon: "!text-saffron-300" },
          }}
        />
      </SessionCtx.Provider>
    </ConfigCtx.Provider>
  );
}
