"use client";
import { m as motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronDown,
  ClipboardList,
  Coins,
  Download,
  Heart,
  Home,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useIsDesktop, useSidebarCollapsed } from "@/lib/client/use-media";
import { CATEGORIES } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { LogoMark } from "./brand/logo-mark";
import { LanguageSwitcher } from "./language-switcher";
import { CartDrawer } from "./market/cart-drawer";
import { useMarketState } from "./market-state";
import { useSession } from "./providers";
import { useInstallPrompt } from "./service-worker";

export function DemoBadge({ className }: { className?: string }) {
  const t = useTranslations("common");
  return <span className={cn("inline-flex items-center rounded-full bg-night px-2.5 py-1 text-xs font-bold tracking-wide text-saffron-300 uppercase", className)}>{t("demo")}</span>;
}

export function CreditsPill() {
  const { profile } = useSession();
  const t = useTranslations("common");
  if (!profile || profile.role !== "seller") return null;
  return (
    <Link
      href="/seller/credits"
      className={cn("inline-flex min-h-12 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold shadow-soft transition-transform hover:-translate-y-0.5", profile.credits < 4 ? "bg-red-50 text-danger" : "bg-paper")}
      aria-label={t("photosLeft", { count: profile.credits })}
      title={t("photosLeft", { count: profile.credits })}
    >
      <Coins className="size-5 text-saffron-700" aria-hidden />
      <motion.span key={profile.credits} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {profile.credits}
      </motion.span>
    </Link>
  );
}

function Badge({ n, bumpEvent }: { n: number; bumpEvent?: string }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!bumpEvent) return;
    const on = () => setK((x) => x + 1);
    window.addEventListener(bumpEvent, on);
    return () => window.removeEventListener(bumpEvent, on);
  }, [bumpEvent]);
  if (!n) return null;
  return (
    <span key={k} className={cn("absolute -top-2.5 -right-3 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs leading-5 font-extrabold text-on-accent ring-2 ring-ink", k && "anim-bump")}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

const iconBtn = "relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-paper transition-transform hover:-translate-y-0.5 active:translate-y-px";

export function BellButton({ withLabel }: { withLabel?: boolean }) {
  const { profile } = useSession();
  const { unread } = useMarketState();
  const t = useTranslations("notify");
  if (!profile) return null;
  return (
    <Link href="/notifications" className={withLabel ? navLabelBtn : iconBtn} aria-label={`${t("title")}${unread ? ` (${unread})` : ""}`} title={t("title")}>
      <span className="relative">
        <Bell className={cn("size-6", unread && "anim-bounce")} key={unread} aria-hidden />
        <Badge n={unread} />
      </span>
      {withLabel ? <span aria-hidden className="hidden xl:inline">{t("title")}</span> : null}
    </Link>
  );
}

const navLabelBtn = "relative flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[13px] font-semibold transition-colors hover:bg-accent-soft";

/** Phones/tablets: goes to /cart. Desktop: opens the slide-in cart drawer. */
export function CartButton({ withLabel }: { withLabel?: boolean }) {
  const { cartCount } = useMarketState();
  const t = useTranslations("cart");
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const inner = (
    <>
      <span className="relative">
        <ShoppingBag className="size-6" aria-hidden />
        <Badge n={cartCount} bumpEvent="cart-bump" />
      </span>
      {withLabel ? <span aria-hidden className="hidden xl:inline">{t("title")}</span> : null}
    </>
  );
  const cls = withLabel ? navLabelBtn : iconBtn;
  return desktop ? (
    <>
      <button type="button" data-cart-target onClick={() => setOpen(true)} className={cls} aria-label={`${t("title")} (${cartCount})`} title={t("title")}>
        {inner}
      </button>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  ) : (
    <Link href="/cart" data-cart-target className={cls} aria-label={`${t("title")} (${cartCount})`}>
      {inner}
    </Link>
  );
}

export function InstallButton({ className }: { className?: string }) {
  const t = useTranslations("settings");
  const { available, install } = useInstallPrompt();
  if (!available) return null;
  return (
    <button type="button" onClick={install} className={cn("inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-night px-4 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5", className)}>
      <Download className="size-5" aria-hidden />
      {t("install")}
    </button>
  );
}

/** Search box for tablet + desktop headers. "/" focuses it from anywhere. */
function SearchBoxInner({ big }: { big?: boolean }) {
  const t = useTranslations("market");
  const router = useRouter();
  const params = useSearchParams();
  const path = usePathname();
  const ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(path === "/search" ? (params.get("q") ?? "") : "");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-full border-2 border-ink bg-paper px-4 focus-within:border-accent", big ? "min-h-13" : "min-h-12")}
    >
      <Search className="size-5 shrink-0 text-accent-strong" aria-hidden />
      <input
        ref={ref}
        id="site-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        enterKeyHint="search"
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="min-h-11 w-full min-w-0 bg-transparent text-base outline-none"
      />
      <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 text-xs text-ink-soft xl:inline" aria-hidden>
        /
      </kbd>
    </form>
  );
}
function SearchBox(props: { big?: boolean }) {
  return (
    <Suspense fallback={<div className="min-h-12 flex-1 rounded-full border-2 border-ink bg-paper" />}>
      <SearchBoxInner {...props} />
    </Suspense>
  );
}

function CategoriesMenu() {
  const t = useTranslations("categories");
  const ts = useTranslations("search");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 font-semibold transition-colors hover:bg-accent-soft">
        {ts("category")}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="anim-fade absolute top-full left-0 z-40 mt-2 grid w-56 gap-1 rounded-2xl bg-paper p-2 shadow-warm">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/search?category=${c}`} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 font-medium hover:bg-accent-soft">
              {t(c)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Sticky header, mobile-first:
 *  - phone:   back/logo · (collapsing title) · search icon · cart · bell · language
 *  - tablet:  search bar visible in the header
 *  - desktop (buyer): marketplace top navbar — logo · categories · big search · wishlist · cart · profile
 *  - desktop (seller): the sidebar holds navigation; header shows the page title + tools
 */
const WIDTHS = { "3xl": "max-w-3xl", "5xl": "max-w-5xl", "6xl": "max-w-6xl" } as const;

export function AppHeader({
  title,
  back,
  side = "buyer",
  wide,
  width: contentWidth = "6xl",
  actions,
}: {
  title?: string;
  back?: string | true;
  side?: "buyer" | "seller";
  wide?: boolean;
  /** match the page's content column so the title lines up with it */
  width?: keyof typeof WIDTHS;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("common");
  const tn = useTranslations("nav");
  const { profile } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const on = () => setCollapsed(window.scrollY > 36);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const buyer = side === "buyer";
  const width = wide ? "max-w-[1440px]" : WIDTHS[contentWidth];

  const backBtn = back ? (
    <button
      type="button"
      onClick={() => (back === true ? router.back() : router.push(back))}
      className="-ml-1 inline-flex min-h-12 shrink-0 items-center gap-1 rounded-full pr-3 pl-2 font-semibold transition-colors hover:bg-accent-soft"
    >
      <ArrowLeft className="size-6" aria-hidden />
      <span className={cn(title && collapsed && "sr-only md:not-sr-only")}>{t("back")}</span>
    </button>
  ) : null;

  const logo = (
    <Link href={buyer ? "/market" : "/seller"} className="flex shrink-0 items-center" aria-label={t("appName")}>
      <LogoMark size={40} label={t("appName")} wordClass={cn((profile?.isDemo || title) && "hidden min-[500px]:inline", buyer && "md:hidden lg:inline")} />
    </Link>
  );

  return (
    <>
      <header className={cn("safe-top sticky top-0 z-30 transition-[background-color,box-shadow] duration-200", collapsed ? "bg-cream/95 shadow-[0_2px_0_var(--fg)] backdrop-blur-md" : "bg-cream", buyer && "lg:bg-paper lg:shadow-[0_2px_0_var(--fg)]")}>
        {/* phone + tablet */}
        <div className={cn("mx-auto flex min-h-16 items-center gap-1.5 px-3 min-[400px]:gap-2 min-[400px]:px-4", buyer && "lg:hidden", width)}>
          {backBtn ?? (buyer || !profile ? logo : <span className="md:hidden">{logo}</span>)}
          {title ? (
            <span className={cn("min-w-0 truncate font-display text-lg font-semibold transition-[opacity,transform] duration-200 md:hidden", collapsed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")} aria-hidden={!collapsed}>
              {title}
            </span>
          ) : profile?.isDemo ? (
            <DemoBadge className={cn("md:hidden", back && "hidden min-[430px]:inline-flex")} />
          ) : null}
          {buyer ? (
            <div className="mx-2 hidden min-w-0 flex-1 md:flex">
              <SearchBox />
            </div>
          ) : (
            <span className="hidden min-w-0 flex-1 truncate font-display text-xl md:block">{title}</span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {actions}
            {buyer ? (
              <Link href="/search?focus=1" className={cn(iconBtn, "md:hidden")} aria-label={tn("search")}>
                <Search className="size-6" aria-hidden />
              </Link>
            ) : null}
            {buyer ? <CartButton /> : <CreditsPill />}
            <BellButton />
            {!buyer ? <InstallButton className="hidden xl:inline-flex" /> : null}
            <LanguageSwitcher compact />
          </div>
        </div>

        {/* desktop marketplace navbar */}
        {buyer ? (
          <div className="mx-auto hidden min-h-[72px] max-w-[1440px] items-center gap-3 px-6 lg:flex">
            {logo}
            {profile?.isDemo ? <DemoBadge /> : null}
            <CategoriesMenu />
            <SearchBox big />
            <nav className="flex items-center gap-1" aria-label={tn("main")}>
              <Link href="/wishlist" className={navLabelBtn} aria-label={tn("wishlist")} title={tn("wishlist")}>
                <Heart className="size-6" aria-hidden />
                <span className="hidden xl:inline" aria-hidden>{tn("wishlist")}</span>
              </Link>
              <CartButton withLabel />
              <Link href="/account/orders" className={navLabelBtn} aria-label={tn("orders")} title={tn("orders")}>
                <ClipboardList className="size-6" aria-hidden />
                <span className="hidden xl:inline" aria-hidden>{tn("orders")}</span>
              </Link>
              <Link href="/account" className={navLabelBtn} aria-label={tn("profile")} title={tn("profile")}>
                <User className="size-6" aria-hidden />
                <span className="hidden max-w-20 truncate xl:inline" aria-hidden>{profile?.name?.split(" ")[0] || tn("profile")}</span>
              </Link>
              <BellButton withLabel />
            </nav>
            <InstallButton className="hidden xl:inline-flex" />
            <LanguageSwitcher compact />
          </div>
        ) : null}
      </header>

      {title || (buyer && back) ? (
        <div className={cn("mx-auto px-4 lg:px-6", width)}>
          {back ? <div className="hidden pt-3 lg:block">{backBtn}</div> : null}
          {title ? (
            <h1 className={cn("origin-left pt-1 pb-2 font-display text-[28px] leading-tight transition-[opacity,transform] duration-200 md:text-3xl", collapsed ? "-translate-y-2 scale-95 opacity-0 md:translate-y-0 md:scale-100 md:opacity-100" : "opacity-100", !buyer && "md:hidden")}>{title}</h1>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const BUYER_NAV = [
  { href: "/market", icon: Home, key: "home", match: ["/market", "/product", "/shop"] },
  { href: "/search", icon: Search, key: "search", match: ["/search"] },
  { href: "/wishlist", icon: Heart, key: "wishlist", match: ["/wishlist"] },
  { href: "/account/orders", icon: ClipboardList, key: "orders", match: ["/account/orders"] },
  { href: "/account", icon: User, key: "profile", match: ["/account"] },
] as const;

const SELLER_NAV = [
  { href: "/seller", icon: LayoutDashboard, key: "dashboard", match: ["/seller"] },
  { href: "/seller/create/capture", icon: Camera, key: "makePhotos", match: ["/seller/create", "/seller/gallery"] },
  { href: "/seller/products", icon: Package, key: "products", match: ["/seller/products"] },
  { href: "/seller/orders", icon: ShoppingBag, key: "orders", match: ["/seller/orders"] },
  { href: "/seller/shop", icon: Store, key: "shop", match: ["/seller/shop", "/seller/credits"] },
] as const;
const SELLER_EXTRA = [{ href: "/seller/settings", icon: Settings, key: "settings", match: ["/seller/settings"] }] as const;

function useActive(items: readonly { href: string; match: readonly string[] }[]) {
  const path = usePathname();
  return items
    .flatMap((it) => it.match.map((m) => ({ it, m })))
    .filter(({ m }) => path === m || path.startsWith(m + "/"))
    .sort((a, b) => b.m.length - a.m.length)[0]?.it.href;
}

/** Phones: bottom tab bar. The pill slides between tabs; the active icon bounces. */
export function BottomNav({ side }: { side: "buyer" | "seller" }) {
  const t = useTranslations("nav");
  const items = side === "seller" ? SELLER_NAV : BUYER_NAV;
  const active = useActive(items);
  return (
    <nav className="safe-bottom no-print fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper md:hidden" aria-label={t("main")}>
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {items.map(({ href, icon: Icon, key }) => {
          const on = active === href;
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[12px] leading-tight font-semibold", on ? "text-ink" : "text-ink-soft")}>
                {on ? <motion.span layoutId={`nav-pill-${side}`} className="absolute top-1.5 h-8 w-14 rounded-full border-2 border-ink bg-saffron-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} /> : null}
                <Icon key={on ? "on" : "off"} className={cn("relative size-6", on && "anim-bounce text-night")} aria-hidden />
                <span className="relative max-w-full truncate px-0.5">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Tablet: slim icon rail (labels as tooltips). Desktop seller: full sidebar,
 * collapsible to the rail. Desktop buyer uses the top navbar instead.
 */
export function SideNav({ side }: { side: "buyer" | "seller" }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const items = side === "seller" ? [...SELLER_NAV, ...SELLER_EXTRA] : BUYER_NAV;
  const active = useActive(items);
  const [collapsedPref, setCollapsed] = useSidebarCollapsed();
  const desktop = useIsDesktop();
  const full = side === "seller" && desktop && !collapsedPref;
  return (
    <nav
      aria-label={t("main")}
      className={cn(
        "no-print safe-top fixed inset-y-0 left-0 z-30 hidden flex-col gap-1 border-r-2 border-ink bg-paper px-3 pb-4 md:flex",
        side === "buyer" && "lg:hidden",
        full ? "w-[var(--sidebar-w)]" : "w-[76px]",
      )}
    >
      <Link href={side === "seller" ? "/seller" : "/market"} className={cn("mt-3 mb-4 flex min-h-12 items-center gap-2", full ? "px-2" : "justify-center")} aria-label={tc("appName")}>
        <LogoMark size={42} label={tc("appName")} wordmark={full} />
      </Link>
      {items.map(({ href, icon: Icon, key }) => {
        const on = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            aria-label={full ? undefined : t(key)}
            data-tip={full ? undefined : t(key)}
            className={cn(
              "relative flex min-h-12 items-center gap-3 rounded-2xl font-semibold transition-colors hover:bg-accent-soft",
              full ? "px-3" : "justify-center",
              on ? "text-ink" : "text-ink-soft",
            )}
          >
            {on ? <motion.span layoutId={`rail-pill-${side}`} className="absolute inset-0 rounded-2xl border-2 border-ink bg-saffron-500" transition={{ type: "spring", stiffness: 300, damping: 30 }} /> : null}
            <Icon key={on ? "on" : "off"} className={cn("relative size-6 shrink-0", on && "anim-bounce text-night")} aria-hidden />
            {full ? <span className={cn("relative", on && "font-extrabold text-night")}>{t(key)}</span> : null}
          </Link>
        );
      })}
      {side === "seller" ? (
        <div className="mt-auto grid gap-1">
          <Link href="/market" data-tip={full ? undefined : t("home")} aria-label={full ? undefined : t("home")} className={cn("flex min-h-12 items-center gap-3 rounded-2xl text-ink-soft hover:bg-accent-soft", full ? "px-3" : "justify-center")}>
            <Home className="size-6 shrink-0" aria-hidden />
            {full ? <span className="font-semibold">{t("home")}</span> : null}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsedPref)}
            className={cn("hidden min-h-12 items-center gap-3 rounded-2xl text-ink-soft hover:bg-accent-soft lg:flex", full ? "px-3" : "justify-center")}
            aria-label={full ? "Collapse" : "Expand"}
            aria-expanded={full}
            data-tip={full ? undefined : "Expand"}
          >
            {full ? <PanelLeftClose className="size-6" aria-hidden /> : <PanelLeftOpen className="size-6" aria-hidden />}
          </button>
        </div>
      ) : null}
    </nav>
  );
}

/** Wraps a side's pages: sets the nav offsets used by content and fixed bars. */
export function Shell({ side, children, hideNav }: { side: "buyer" | "seller"; children: React.ReactNode; hideNav?: boolean }) {
  const [collapsed] = useSidebarCollapsed();
  return (
    <div data-side={side} data-shell={side} data-collapsed={collapsed ? "true" : "false"} style={hideNav ? ({ "--nav-bottom": "0px" } as React.CSSProperties) : undefined}>
      <div className={cn("with-nav", hideNav ? "pb-0" : "pb-28 md:pb-10")}>{children}</div>
      {hideNav ? null : <BottomNav side={side} />}
      <SideNav side={side} />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4" aria-busy="true">
      <div className="skeleton h-12 rounded-2xl" />
      <div className="skeleton h-40 rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton aspect-[4/5] rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}

/** Logged-in users only (any role). Middleware guards the same routes server-side. */
export function RequireAuth({ children, role }: { children: React.ReactNode; role?: "seller" }) {
  const { status, profile } = useSession();
  const router = useRouter();
  const path = usePathname();
  const needsOnboarding = status === "ready" && profile && (!profile.role || (profile.role === "seller" && !profile.shopName) || (profile.role === "buyer" && !profile.name));
  const wrongRole = status === "ready" && role === "seller" && profile?.role !== "seller";
  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=${encodeURIComponent(path)}${role ? `&role=${role}` : ""}`);
    else if (needsOnboarding) router.replace(`/onboarding?next=${encodeURIComponent(path)}`);
    else if (wrongRole) router.replace("/account?become=seller");
  }, [status, needsOnboarding, wrongRole, router, path, role]);
  if (status !== "ready" || needsOnboarding || wrongRole) return <PageSkeleton />;
  return <>{children}</>;
}
