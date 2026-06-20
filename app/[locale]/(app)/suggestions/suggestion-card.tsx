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
  const [state, setState] = useState<"idle" | "sent" | "passing" | "passed">(
    "idle",
  );

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
      className={`overflow-hidden rounded-cardlg border bg-surface dark:bg-anthracite-800 ${
        featured
          ? "border-[#DCD3BF] shadow-cardfeat dark:border-[#3A3322] dark:shadow-[0_8px_28px_-14px_rgba(216,184,96,.25)]"
          : "border-sand-200 dark:border-anthracite-600"
      }`}
    >
      {/* Portrait — grand format. Photo réelle (floutée, révélée en avançant)
          à venir via un pipeline sécurisé ; en attendant, dégradé de marque. */}
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{ background: GRADIENTS[profile.gradient] }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-night/10" />
        {/* Voile bas pour la lisibilité du texte superposé. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E16]/80 via-[#0B0E16]/25 to-transparent" />

        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-night/50 px-2.5 py-1 text-[10.5px] font-semibold text-[#E7E2D6] backdrop-blur-[2px]">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect
              x="5"
              y="10.5"
              width="14"
              height="9.5"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
          {t("suggestions.photoReveal")}
        </span>

        {profile.isVerified && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-gold/55 bg-night/55 px-2.5 py-1 text-[11px] font-semibold text-[#F2E6C2] backdrop-blur-[2px]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              aria-label={t("common.verified")}
            >
              <path
                d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
                className="fill-gold dark:fill-gold-light"
              />
            </svg>
            {t("common.verified")}
          </span>
        )}

        <div className="absolute inset-x-4 bottom-3.5 text-[#F6F2E9]">
          <div className="font-display text-[25px] font-medium leading-none [text-shadow:0_1px_8px_rgba(0,0,0,.4)]">
            {profile.displayName}
            <span className="text-[17px] font-normal opacity-85">
              {" "}
              · {profile.age}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.denomination && (
              <span className="rounded-full border border-[#F7F5F0]/20 bg-[#F7F5F0]/15 px-2.5 py-0.5 text-[10.5px] font-semibold backdrop-blur-[3px]">
                {profile.denomination}
              </span>
            )}
            <span className="rounded-full border border-gold/45 bg-gold/20 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#F4E7C2] backdrop-blur-[3px]">
              {t("suggestions.intentMarriage")}
            </span>
            {statusKey && (
              <span className="rounded-full border border-[#F7F5F0]/20 bg-[#F7F5F0]/15 px-2.5 py-0.5 text-[10.5px] font-semibold backdrop-blur-[3px]">
                {t(`profile.${statusKey}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {profile.intentionStatement ? (
          <p className="font-display text-[14px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
            « {profile.intentionStatement} »
          </p>
        ) : (
          <div className="flex items-center gap-1.5 text-[12.5px] text-sage dark:text-[#7FA98C]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8.5 12.5l2.2 2.2 4.8-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("suggestions.alignedClose")}
          </div>
        )}

        {state === "sent" ? (
          <p className="mt-3.5 rounded-btnsm bg-[#EAF0EB] px-3 py-2.5 text-center text-[13px] font-medium text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
            {t("suggestions.requestSent")}
          </p>
        ) : (
          <div className="mt-3.5 flex gap-2.5">
            <button
              type="button"
              onClick={discover}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-btn bg-navy py-3 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("suggestions.discover")}
              <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              onClick={pass}
              disabled={state === "passing"}
              aria-label={t("suggestions.pass")}
              className="rounded-btn border border-sand-400 px-4 py-3 text-sm font-medium text-[#6B665C] disabled:opacity-50 dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("suggestions.pass")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
