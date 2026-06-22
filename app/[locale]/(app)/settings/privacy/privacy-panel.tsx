"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BlockedUsers } from "@/components/BlockedUsers";
import { PhoneVerify } from "@/components/PhoneVerify";
import { AsyncButton } from "@/components/AsyncButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Switch } from "@/components/Switch";
import { LogoutButton } from "@/components/LogoutButton";
import { useToast } from "@/components/Toast";
import type { VisibilityLevel } from "@prisma/client";

const LEVEL_SEGMENTS: Record<string, { filled: number; cls: string }> = {
  PUBLIC_CONTROLLED: { filled: 1, cls: "bg-sage" },
  AFTER_MATCH: { filled: 2, cls: "bg-gold" },
  AFTER_DIALOGUE: { filled: 3, cls: "bg-gold" },
  AFTER_DISCERNMENT: { filled: 4, cls: "bg-amberink" },
  COACH_ONLY: { filled: 5, cls: "bg-navy dark:bg-[#B9C6E0]" },
  PRIVATE: { filled: 5, cls: "bg-navy dark:bg-[#B9C6E0]" },
  MANUAL_SHARE: { filled: 4, cls: "bg-warmgray" },
};

export function PrivacyPanel({
  initial,
  fieldLevels,
}: {
  initial: {
    antiMalaiseEnabled: boolean;
    antiMalaiseRadiusKm: number;
    invisibleMode: boolean;
  };
  fieldLevels: Record<string, VisibilityLevel>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Désactiver le filtre anti-malaise = action sensible (le profil redevient
  // visible à la communauté) : on confirme avant.
  const [confirmAntiMalaiseOff, setConfirmAntiMalaiseOff] = useState(false);

  async function save(patch: Partial<typeof initial>) {
    const prev = state;
    setState({ ...state, ...patch });
    setSaving(true);
    try {
      const res = await fetch("/api/me/privacy-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("save_failed");
      toast.success(t("privacy.saved"));
    } catch {
      setState(prev); // rollback de l'affichage si l'enregistrement échoue
      toast.error(t("privacy.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    const res = await fetch("/api/me", { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  const fields = [
    { key: "photo", label: t("privacy.fieldPhoto") },
    { key: "legalName", label: t("privacy.fieldLegalName") },
    { key: "church", label: t("privacy.fieldChurch") },
    { key: "testimony", label: t("privacy.fieldTestimony") },
    { key: "children", label: t("privacy.fieldChildren") },
  ];

  return (
    <main className="px-4 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
          {t("privacy.title")}
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <Link
        href="/settings/premium"
        className="mb-4 flex items-center gap-3 rounded-card border border-gold/40 bg-[#FBF6E9] p-4 dark:border-[#463A1F] dark:bg-[#272117]"
      >
        <span aria-hidden className="text-lg text-gold">
          ★
        </span>
        <span className="flex-1 text-[16px] font-semibold text-gold-ink dark:text-[#E0C77A]">
          {t("premium.title")}
        </span>
        <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
          {t("premium.price")} →
        </span>
      </Link>

      <Link
        href="/settings/account"
        className="mb-4 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <span aria-hidden className="text-lg text-warmgray dark:text-[#9A958B]">
          ⚙
        </span>
        <span className="flex-1 text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("account.linkTitle")}
        </span>
        <span className="lbl text-[11px] text-warmgray dark:text-[#9A958B]">
          →
        </span>
      </Link>

      <Link
        href="/settings/trust"
        className="mb-4 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <span aria-hidden className="text-lg text-sage dark:text-[#7FA98C]">
          ✓
        </span>
        <span className="flex-1 text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("trust.linkTitle")}
        </span>
        <span className="lbl text-[11px] text-warmgray dark:text-[#9A958B]">
          →
        </span>
      </Link>

      <Link
        href="/settings/sponsor"
        className="mb-4 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <span aria-hidden className="text-lg">
          🤝
        </span>
        <span className="flex-1 text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("sponsor.linkTitle")}
        </span>
        <span className="lbl text-[11px] text-warmgray dark:text-[#9A958B]">
          →
        </span>
      </Link>

      <Link
        href="/settings/notifications"
        className="mb-4 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <span aria-hidden className="text-lg text-gold">
          🔔
        </span>
        <span className="flex-1 text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("notifications.linkTitle")}
        </span>
        <span className="lbl text-[11px] text-warmgray dark:text-[#9A958B]">
          →
        </span>
      </Link>

      <Link
        href="/safety"
        className="mb-4 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <span aria-hidden className="text-lg">
          🛡️
        </span>
        <span className="flex-1 text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("antiScam.linkTitle")}
        </span>
        <span className="lbl text-[11px] text-warmgray dark:text-[#9A958B]">
          →
        </span>
      </Link>

      {/* Anti-malaise - gratuit, jamais premium */}
      <section className="mb-4 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-[18px] font-semibold text-night dark:text-[#ECE7DD]">
              {t("privacy.antiMalaiseTitle")}
            </div>
            <p className="mt-1 text-[15px] leading-snug text-[#6B665C] dark:text-[#9A958B]">
              {t("privacy.antiMalaiseDesc")}
            </p>
          </div>
          <Switch
            checked={state.antiMalaiseEnabled}
            disabled={saving}
            onChange={(v) => {
              if (!v && state.antiMalaiseEnabled) {
                setConfirmAntiMalaiseOff(true);
              } else {
                save({ antiMalaiseEnabled: v });
              }
            }}
            label={t("privacy.antiMalaiseTitle")}
          />
        </div>
        <div className="mt-3.5 border-t border-sand-100 pt-3.5 dark:border-anthracite-700">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="lbl text-[11px] text-sand-600 dark:text-[#9A958B]">
              {t("privacy.radius")}
            </span>
            <span className="font-mono text-xs text-gold-deep dark:text-gold-light">
              {state.antiMalaiseRadiusKm} km
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={state.antiMalaiseRadiusKm}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                antiMalaiseRadiusKm: Number(e.target.value),
              }))
            }
            onMouseUp={() =>
              save({ antiMalaiseRadiusKm: state.antiMalaiseRadiusKm })
            }
            onTouchEnd={() =>
              save({ antiMalaiseRadiusKm: state.antiMalaiseRadiusKm })
            }
            aria-label={t("privacy.radius")}
            aria-valuenow={state.antiMalaiseRadiusKm}
            aria-valuetext={`${state.antiMalaiseRadiusKm} km`}
            className="w-full accent-[#1A2744] dark:accent-[#D8B860]"
          />
        </div>
      </section>

      <h2 className="lbl mb-2.5 text-[12px] text-gold-deep dark:text-gold-light">
        {t("privacy.fieldVisibility")}
      </h2>
      <section className="mb-4 overflow-hidden rounded-card border border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800">
        {fields.map((f, i) => {
          const level = fieldLevels[f.key];
          const seg = LEVEL_SEGMENTS[level];
          return (
            <div
              key={f.key}
              className={`px-4 py-3 ${i < fields.length - 1 ? "border-b border-sand-100 dark:border-anthracite-700" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[16px] font-medium text-ink dark:text-[#ECE7DD]">
                  {f.label}
                </span>
                <span className="lbl text-[11px] text-warmgray dark:text-[#9A958B]">
                  {t(`visibility.${level}`)}
                </span>
              </div>
              <div className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-1 flex-1 rounded-[2px] ${
                      n <= seg.filled
                        ? seg.cls
                        : "bg-sand-300 dark:bg-anthracite-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mb-3.5 flex items-center gap-3 rounded-[14px] border border-sand-200 bg-surface px-4 py-3.5 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex-1 text-sm font-medium text-ink dark:text-[#ECE7DD]">
          {t("privacy.invisibleMode")}
        </div>
        <Switch
          checked={state.invisibleMode}
          disabled={saving}
          onChange={(v) => save({ invisibleMode: v })}
          label={t("privacy.invisibleMode")}
        />
      </section>

      {/* RGPD - export et suppression, jamais cachés */}
      <PhoneVerify />

      <BlockedUsers />

      <div className="flex gap-2.5 pb-8 pt-6">
        <a
          href="/api/me/export"
          download
          className="flex-1 rounded-btnsm border border-sand-400 py-3 text-center text-[16px] font-medium text-[#3A372F] dark:border-anthracite-600 dark:text-[#CFCAC0]"
        >
          {t("privacy.exportData")}
        </a>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex-1 rounded-btnsm border border-[#D8B6B0] py-3 text-[16px] font-medium text-danger dark:border-[#5A3A34]"
        >
          {t("privacy.deleteAccount")}
        </button>
      </div>

      {/* Compte / session : déconnexion en bas de page. */}
      <section className="border-t border-sand-200 pt-5 dark:border-anthracite-600">
        <h2 className="lbl mb-2.5 text-[12px] text-gold-deep dark:text-gold-light">
          {t("account.linkTitle")}
        </h2>
        <LogoutButton />
      </section>

      <p className="pb-8 pt-7 text-center text-[14px] text-sand-500 dark:text-[#65625B]">
        <Link href="/legal/terms" className="underline">
          {t("legal.terms")}
        </Link>
        {" · "}
        <Link href="/legal/privacy" className="underline">
          {t("legal.privacy")}
        </Link>
      </p>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 px-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-cardlg bg-surface p-5 dark:bg-anthracite-800">
            <h3 className="font-display text-xl text-night dark:text-[#ECE7DD]">
              {t("privacy.deleteConfirmTitle")}
            </h3>
            <p className="mt-2 text-[16px] leading-normal text-warmgray dark:text-[#9A958B]">
              {t("privacy.deleteConfirmBody")}
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-btnsm border border-sand-400 py-3 text-sm font-medium dark:border-anthracite-600 dark:text-[#CFCAC0]"
              >
                {t("common.cancel")}
              </button>
              <AsyncButton
                onClick={deleteAccount}
                className="flex-1 rounded-btnsm bg-danger py-3 text-sm font-semibold text-white"
              >
                {t("privacy.deleteConfirmCta")}
              </AsyncButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAntiMalaiseOff}
        title={t("privacy.antiMalaiseDisableConfirmTitle")}
        body={t("privacy.antiMalaiseDisableConfirmBody")}
        confirmLabel={t("privacy.antiMalaiseDisableCta")}
        tone="danger"
        onConfirm={async () => {
          await save({ antiMalaiseEnabled: false });
          setConfirmAntiMalaiseOff(false);
        }}
        onCancel={() => setConfirmAntiMalaiseOff(false)}
      />
    </main>
  );
}
