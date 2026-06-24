"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AsyncButton } from "@/components/AsyncButton";
import { Spinner } from "@/components/Spinner";
import { BlurhashImage } from "@/components/BlurhashImage";
import { Radar } from "@/components/Radar";
import { optionLabel, DENOMINATION_LABELS } from "@/lib/profile-options";

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
  photoBlurhash?: string | null;
  // P2 : axes de compatibilité (0..1) pour le radar « sujets à approfondir ».
  axes?: {
    faith: number;
    children: number;
    finances: number;
    location: number;
    vision: number;
  } | null;
  // P6 : a désigné un Parrain/Marraine (signal de confiance "accompagné·e").
  hasSponsor?: boolean;
  // Ecosysteme : Compagnon IA (badge clair, jamais le sceau humain).
  kind?: string | null;
};

export function SuggestionCard({
  profile,
  featured,
}: {
  profile: Profile;
  featured?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sent" | "passing" | "passed">(
    "idle",
  );

  async function discover() {
    const res = await fetch("/api/matches/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    // Compagnon IA : rencontre ouverte d'emblee, on entre directement dans le
    // fil (le compagnon a depose son message d'accueil transparent).
    const data = (await res.json().catch(() => null)) as {
      matchId?: string;
      companion?: boolean;
    } | null;
    if (res.ok && data?.companion && data.matchId) {
      router.push(`/messages/${data.matchId}`);
      return;
    }
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
      {/* Portrait - grand format. Pré-match : empreinte BlurHash (silhouette
          floue, aucun octet de la vraie photo) ; dégradé de marque en fallback.
          La photo réelle se révèle en avançant, via le proxy autorisé. */}
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{ background: GRADIENTS[profile.gradient] }}
        aria-hidden
      >
        {profile.photoBlurhash && (
          <BlurhashImage
            hash={profile.photoBlurhash}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-night/10" />
        {/* Voile bas pour la lisibilité du texte superposé. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E16]/80 via-[#0B0E16]/25 to-transparent" />

        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-night/50 px-2.5 py-1 text-[13px] font-semibold text-[#E7E2D6] backdrop-blur-[2px]">
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

        {profile.kind === "AI_COMPANION" ? (
          // Profil IA : badge clair, jamais le sceau "verifie" humain (trompeur).
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-[#9C8FCB]/60 bg-night/55 px-2.5 py-1 text-[13px] font-semibold text-[#E7E2F2] backdrop-blur-[2px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3Z"
                fill="currentColor"
              />
            </svg>
            {t("discovery_ecosystem.companionBadge")}
          </span>
        ) : (
          profile.isVerified && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-sage-border bg-night/55 px-2.5 py-1 text-[13px] font-semibold text-sage-ink dark:text-sage-darkInk backdrop-blur-[2px]">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                aria-label={t("common.verified")}
              >
                <path
                  d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
                  className="fill-sage dark:fill-sage-darkInk"
                />
              </svg>
              {t("common.verified")}
            </span>
          )
        )}

        <div className="absolute inset-x-4 bottom-3.5 text-[#F6F2E9]">
          <div className="font-display text-[28px] font-medium leading-none [text-shadow:0_1px_8px_rgba(0,0,0,.4)]">
            {profile.displayName}
            <span className="text-[20px] font-normal opacity-85">
              {" "}
              · {profile.age}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.denomination && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[13px] font-semibold backdrop-blur-[3px] ${
                  profile.denomination === "Catholique"
                    ? "border-info-border bg-info-surface text-info-ink dark:bg-info-darkSurface dark:text-info-darkInk dark:border-info-darkBorder"
                    : profile.denomination === "Évangélique"
                      ? "border-navy bg-navy/10 text-navy dark:bg-gold-light/15 dark:text-gold-light dark:border-gold-light/40"
                      : "border-sand-200 bg-surface/80 text-anthracite-800 dark:border-anthracite-600 dark:bg-anthracite-800/80 dark:text-anthracite-100"
                }`}
              >
                {optionLabel(profile.denomination, DENOMINATION_LABELS, locale)}
              </span>
            )}
            <span className="rounded-full border border-gold/40 bg-gold/20 px-2.5 py-0.5 text-[13px] font-semibold text-gold-light backdrop-blur-[3px]">
              {t("suggestions.intentMarriage")}
            </span>
            {profile.hasSponsor && (
              <span className="flex items-center gap-1 rounded-full border border-[#3F6B50]/55 bg-[#3F6B50]/30 px-2.5 py-0.5 text-[13px] font-semibold text-[#EAF0EB] backdrop-blur-[3px]">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 3l7 3v5c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6l7-3Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("suggestions.accompaniedBadge")}
              </span>
            )}
            {statusKey && (
              <span className="rounded-full border border-[#F7F5F0]/20 bg-[#F7F5F0]/15 px-2.5 py-0.5 text-[13px] font-semibold backdrop-blur-[3px]">
                {t(`profile.${statusKey}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {profile.intentionStatement ? (
          <p className="font-display text-[17px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
            « {profile.intentionStatement} »
          </p>
        ) : (
          <div className="flex items-center gap-1.5 text-[15px] text-sage dark:text-[#7FA98C]">
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

        {profile.axes && (
          <details className="group mt-3 border-t border-sand-100 pt-3 dark:border-anthracite-700">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-semibold text-gold-deep dark:text-gold-light">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                  fill="currentColor"
                />
              </svg>
              {t("suggestions.compatibilityToggle")}
              <span
                aria-hidden
                className="ml-auto text-warmgray transition-transform group-open:rotate-90 dark:text-[#9A958B]"
              >
                ›
              </span>
            </summary>
            <div className="mt-1 flex flex-col items-center">
              <Radar axes={profile.axes} />
              <p className="-mt-1 text-[12px] text-warmgray dark:text-[#8B8579]">
                {t("suggestions.compatibilityNote")}
              </p>
            </div>
          </details>
        )}

        {state === "sent" ? (
          <p className="mt-3.5 rounded-btnsm bg-[#EAF0EB] px-3 py-2.5 text-center text-[16px] font-medium text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
            {t("suggestions.requestSent")}
          </p>
        ) : (
          <div className="mt-3.5 flex gap-2.5">
            <AsyncButton
              onClick={discover}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-btn bg-navy py-3 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("suggestions.discover")}
              <span aria-hidden>→</span>
            </AsyncButton>
            <button
              type="button"
              onClick={pass}
              disabled={state === "passing"}
              aria-label={t("suggestions.pass")}
              className="flex items-center justify-center gap-2 rounded-btn border border-sand-400 px-3 py-3 text-sm font-medium text-[#6B665C] disabled:opacity-50 dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {state === "passing" && <Spinner className="h-4 w-4" />}
              {t("suggestions.pass")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
