"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const GRADIENTS = [
  "radial-gradient(110% 90% at 35% 25%, #6E7790 0%, #41506E 50%, #222F4C 100%)",
  "radial-gradient(110% 90% at 40% 30%, #8A7A6A 0%, #5C4D44 50%, #352A28 100%)",
  "radial-gradient(110% 90% at 30% 25%, #6F8478 0%, #43564B 50%, #26342C 100%)",
];

type Profile = {
  id: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  denomination: string | null;
  vertical: string | null;
  maritalStatus: string | null;
  hasChildren: boolean;
  intentionStatement: string | null;
  gradient: number;
};

export function SuggestionCard({
  profile,
  featured,
}: {
  profile: Profile;
  featured?: boolean;
}) {
  const t = useTranslations();
  const [state, setState] = useState<"idle" | "sent" | "passing" | "passed">("idle");

  async function discover() {
    const res = await fetch("/api/matches/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    if (res.ok || res.status === 409) setState("sent");
  }

  async function pass() {
    setState("passing");
    const res = await fetch("/api/passes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    setState(res.ok ? "passed" : "idle");
  }

  if (state === "passed") return null;

  const statusKey =
    profile.maritalStatus === "widowed"
      ? "widowed"
      : profile.maritalStatus === "divorced"
        ? "divorced"
        : profile.maritalStatus === "single_parent"
          ? "singleParent"
          : null;

  return (
    <article
      className={`rounded-cardlg border bg-surface p-4 dark:bg-anthracite-800 ${
        featured
          ? "border-[#DCD3BF] shadow-cardfeat dark:border-[#3A3322] dark:shadow-[0_8px_28px_-14px_rgba(216,184,96,.25)]"
          : "border-sand-200 dark:border-anthracite-600"
      }`}
    >
      <div className="flex gap-3.5">
        <div
          aria-hidden
          className="h-[104px] w-[84px] flex-none rounded-btn blur-[6px]"
          style={{ background: GRADIENTS[profile.gradient] }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[19px] text-night dark:text-[#ECE7DD]">
              {profile.displayName}
            </span>
            {profile.isVerified && (
              <svg width="15" height="15" viewBox="0 0 24 24" aria-label={t("common.verified")}>
                <path d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z" className="fill-gold dark:fill-gold-light" />
              </svg>
            )}
            <span className="text-[13px] text-sand-600 dark:text-[#7E7A72]">· {profile.age}</span>
          </div>
          <div className="my-2 flex flex-wrap gap-1.5">
            {profile.denomination && (
              <span className="rounded-[7px] bg-[#E7EBF1] px-2 py-0.5 text-[10.5px] font-semibold text-[#2A3550] dark:bg-[#222C42] dark:text-[#B9C6E0]">
                {profile.denomination}
              </span>
            )}
            <span className="rounded-[7px] bg-[#F1EBD9] px-2 py-0.5 text-[10.5px] font-semibold text-gold-ink dark:bg-[#2C2818] dark:text-gold-light">
              {t("suggestions.intentMarriage")}
            </span>
            {statusKey && (
              <span className="rounded-[7px] bg-[#EAE6DC] px-2 py-0.5 text-[10.5px] font-semibold text-warmgray dark:bg-[#2A2B30] dark:text-[#9A958B]">
                {t(`profile.${statusKey}`)}
              </span>
            )}
          </div>
          {profile.intentionStatement ? (
            <p className="font-display text-[12.5px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
              « {profile.intentionStatement} »
            </p>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-sage dark:text-[#7FA98C]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8.5 12.5l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("suggestions.alignedClose")}
            </div>
          )}
        </div>
      </div>
      {state === "sent" ? (
        <p className="mt-3.5 rounded-btnsm bg-[#EAF0EB] px-3 py-2.5 text-center text-[13px] font-medium text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("suggestions.requestSent")}
        </p>
      ) : (
        <div className="mt-3.5 flex gap-2.5">
          <button
            type="button"
            onClick={discover}
            className="flex-1 rounded-btnsm bg-navy py-3 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("suggestions.discover")}
          </button>
          <button
            type="button"
            onClick={pass}
            disabled={state === "passing"}
            className="rounded-btnsm border border-sand-400 px-4 py-3 text-sm font-medium text-[#6B665C] disabled:opacity-50 dark:border-anthracite-600 dark:text-[#9A958B]"
          >
            {t("suggestions.pass")}
          </button>
        </div>
      )}
    </article>
  );
}
