"use client";
import { Cpu, Database, Download, LogOut, Moon, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-chrome";
import { useChangeLocale } from "@/components/language-switcher";
import { useAppConfig, useAuthed } from "@/components/providers";
import { useInstallPrompt } from "@/components/service-worker";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { LocalRepo } from "@/lib/client/local-repo";
import { useTheme } from "@/lib/client/theme";
import { BACKGROUNDS, GENDERS, SHOP_TYPES, type LookOptions, type ShopType } from "@/lib/types";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-[var(--radius-card)] bg-paper p-4 shadow-soft">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

const input = "min-h-12 w-full rounded-xl border-2 border-line bg-cream px-3 text-lg outline-none focus:border-saffron-500";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const to = useTranslations("onboarding");
  const ts = useTranslations("shopTypes");
  const tl = useTranslations("look");
  const tb = useTranslations("backgrounds");
  const ta = useTranslations("account");
  const theme = useTheme();
  const locale = useLocale() as Locale;
  const { change } = useChangeLocale();
  const config = useAppConfig();
  const install = useInstallPrompt();
  const { repo, profile, setProfile, signOut } = useAuthed();

  const [shopName, setShopName] = useState(profile.shopName);
  const [shopType, setShopType] = useState<ShopType>(profile.shopType);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [defaults, setDefaults] = useState<Partial<LookOptions>>(profile.defaults ?? {});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async (patch?: Partial<LookOptions>) => {
    setSaving(true);
    try {
      const next = await repo.updateProfile({
        shopName: shopName.trim().slice(0, 60) || profile.shopName,
        shopType,
        phone: phone.trim().slice(0, 20),
        defaults: patch ? { ...defaults, ...patch } : defaults,
      });
      setProfile(next);
      toast.success(t("saved"));
    } catch {
      toast.error(tc("somethingWrong"));
    } finally {
      setSaving(false);
    }
  };

  const setDefault = (patch: Partial<LookOptions>) => {
    setDefaults((d) => ({ ...d, ...patch }));
    void save(patch);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await repo.deleteAccount();
      toast.success(t("deleteDone"));
      await signOut();
    } catch {
      toast.error(tc("somethingWrong"));
      setDeleting(false);
    }
  };

  return (
    <>
      <AppHeader side="seller" back="/seller/shop" />
      <main className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        <Card title={tc("language")}>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tc("language")}>
            {LOCALES.map((l) => (
              <Chip key={l} selected={l === locale} onClick={() => change(l)} className="justify-center">
                {LOCALE_LABELS[l].native}
              </Chip>
            ))}
          </div>
        </Card>

        <Card title={ta("appearance")}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={ta("appearance")}>
            <Chip selected={!theme.dark} onClick={() => theme.set(false)} className="justify-center">
              <Sun className="size-5" aria-hidden />
              {ta("light")}
            </Chip>
            <Chip selected={theme.dark} onClick={() => theme.set(true)} className="justify-center">
              <Moon className="size-5" aria-hidden />
              {ta("dark")}
            </Chip>
          </div>
        </Card>

        <Card title={t("shop")}>
          <div className="grid gap-3">
            <label className="grid gap-1 font-semibold">
              {to("shopName")}
              <input className={input} value={shopName} onChange={(e) => setShopName(e.target.value)} autoComplete="organization" />
            </label>
            <label className="grid gap-1 font-semibold">
              {t("phone")}
              <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder={t("phonePlaceholder")} />
            </label>
            <div>
              <p className="mb-2 font-semibold">{to("shopType")}</p>
              <ChipGroup label={to("shopType")}>
                {SHOP_TYPES.map((s) => (
                  <Chip key={s} selected={shopType === s} onClick={() => setShopType(s)}>
                    {ts(s)}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
            <Button onClick={() => save()} loading={saving}>
              <Save aria-hidden />
              {tc("save")}
            </Button>
          </div>
        </Card>

        <Card title={t("defaults")}>
          <p className="mb-2 font-semibold">{t("defaultModel")}</p>
          <ChipGroup label={t("defaultModel")}>
            {GENDERS.map((g) => (
              <Chip key={g} selected={defaults.gender === g} onClick={() => setDefault({ gender: g })}>
                {tl(g)}
              </Chip>
            ))}
          </ChipGroup>
          <p className="mt-4 mb-2 font-semibold">{t("defaultBackground")}</p>
          <ChipGroup label={t("defaultBackground")}>
            {BACKGROUNDS.map((b) => (
              <Chip key={b} selected={defaults.background === b} onClick={() => setDefault({ background: b })}>
                {tb(b)}
              </Chip>
            ))}
          </ChipGroup>
        </Card>

        {install.available ? (
          <Button variant="dark" size="lg" block className="mt-5" onClick={install.install}>
            <Download aria-hidden />
            <span className="flex flex-col items-start leading-tight">
              {t("install")}
              <span className="text-sm font-normal text-white/75">{t("installHint")}</span>
            </span>
          </Button>
        ) : null}

        <section className="mt-5 grid gap-2 rounded-[var(--radius-card)] bg-paper p-4 text-[15px] shadow-soft">
          <p className="flex items-center gap-2">
            <Cpu className="size-5 text-saffron-700" aria-hidden />
            <span className="font-semibold">{t("aiMode")}:</span> {config.provider === "real" ? t("aiReal") : t("aiMock")}
          </p>
          <p className="flex items-center gap-2">
            <Database className="size-5 text-saffron-700" aria-hidden />
            <span className="font-semibold">{t("dataMode")}:</span> {repo.kind === "local" ? t("dataLocal") : t("dataCloud")}
          </p>
          {profile.email ? <p className="text-ink-soft">{profile.email}</p> : null}
        </section>

        <div className="mt-5 grid gap-3 pb-6">
          <Button variant="outline" size="lg" block onClick={signOut}>
            <LogOut aria-hidden />
            {t("logout")}
          </Button>
          {repo.kind === "local" ? (
            <Button
              variant="ghost"
              onClick={async () => {
                await LocalRepo.resetDevice();
                toast.success(ta("resetDone"));
                await signOut();
                location.href = "/market";
              }}
            >
              <RotateCcw aria-hidden />
              {ta("resetDemo")}
            </Button>
          ) : null}
          <Button variant="danger" size="lg" block onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden />
            {t("deleteAccount")}
          </Button>
        </div>
      </main>

      <Sheet open={confirmDelete} onOpenChange={setConfirmDelete} title={t("deleteAccount")} description={t("deleteConfirm")}>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            {tc("no")}
          </Button>
          <Button variant="danger" loading={deleting} onClick={remove}>
            <Trash2 aria-hidden />
            {tc("yes")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
