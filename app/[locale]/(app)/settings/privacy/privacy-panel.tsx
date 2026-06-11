"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[27px] w-[46px] flex-none rounded-[14px] transition-colors ${
        checked ? "bg-navy dark:bg-gold-light" : "bg-sand-400 dark:bg-anthracite-600"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
        style={{ left: 0 }}
      />
    </button>
  );
}

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
  const [state, setState] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(patch: Partial<typeof initial>) {
    const next = { ...state, ...patch };
    setState(next);
    await fetch("/api/me/privacy-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    setNotice(t("privacy.saved"));
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
    <main className="px-5 pt-6 safe-top">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
          {t("privacy.title")}
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* Anti-malaise — gratuit, jamais premium */}
      <section className="mb-4 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-night dark:text-[#ECE7DD]">
              {t("privacy.antiMalaiseTitle")}
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-[#6B665C] dark:text-[#9A958B]">
              {t("privacy.antiMalaiseDesc")}
            </p>
          </div>
          <Toggle
            checked={state.antiMalaiseEnabled}
            onChange={(v) => save({ antiMalaiseEnabled: v })}
            label={t("privacy.antiMalaiseTitle")}
          />
        </div>
        <div className="mt-3.5 border-t border-sand-100 pt-3.5 dark:border-anthracite-700">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="lbl text-[9px] text-sand-600 dark:text-[#9A958B]">
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
            onChange={(e) => setState((s) => ({ ...s, antiMalaiseRadiusKm: Number(e.target.value) }))}
            onMouseUp={() => save({ antiMalaiseRadiusKm: state.antiMalaiseRadiusKm })}
            onTouchEnd={() => save({ antiMalaiseRadiusKm: state.antiMalaiseRadiusKm })}
            aria-label={t("privacy.radius")}
            className="w-full accent-[#1A2744] dark:accent-[#D8B860]"
          />
        </div>
      </section>

      <h2 className="lbl mb-2.5 text-[9.5px] text-gold-deep dark:text-gold-light">
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
                <span className="text-[13.5px] font-medium text-ink dark:text-[#ECE7DD]">
                  {f.label}
                </span>
                <span className="lbl text-[8.5px] text-warmgray dark:text-[#9A958B]">
                  {t(`visibility.${level}`)}
                </span>
              </div>
              <div className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-1 flex-1 rounded-[2px] ${
                      n <= seg.filled ? seg.cls : "bg-sand-300 dark:bg-anthracite-600"
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
        <Toggle
          checked={state.invisibleMode}
          onChange={(v) => save({ invisibleMode: v })}
          label={t("privacy.invisibleMode")}
        />
      </section>

      {notice && (
        <p role="status" className="mb-3.5 rounded-btn bg-[#EAF0EB] px-3.5 py-2.5 text-[13px] text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {notice}
        </p>
      )}

      {/* RGPD — export et suppression, jamais cachés */}
      <div className="flex gap-2.5 pb-8">
        <a
          href="/api/me/export"
          download
          className="flex-1 rounded-btnsm border border-sand-400 py-3 text-center text-[13px] font-medium text-[#3A372F] dark:border-anthracite-600 dark:text-[#CFCAC0]"
        >
          {t("privacy.exportData")}
        </a>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex-1 rounded-btnsm border border-[#D8B6B0] py-3 text-[13px] font-medium text-danger dark:border-[#5A3A34]"
        >
          {t("privacy.deleteAccount")}
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 px-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-cardlg bg-surface p-5 dark:bg-anthracite-800">
            <h3 className="font-display text-xl text-night dark:text-[#ECE7DD]">
              {t("privacy.deleteConfirmTitle")}
            </h3>
            <p className="mt-2 text-[13.5px] leading-normal text-warmgray dark:text-[#9A958B]">
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
              <button
                type="button"
                onClick={deleteAccount}
                className="flex-1 rounded-btnsm bg-danger py-3 text-sm font-semibold text-white"
              >
                {t("privacy.deleteConfirmCta")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
