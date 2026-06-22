"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function PhotoHeader({
  displayName,
  age,
  isVerified,
  blurredByDefault,
  photoUrl,
}: {
  displayName: string;
  age: number;
  isVerified: boolean;
  blurredByDefault: boolean;
  photoUrl?: string | null;
}) {
  const t = useTranslations();
  const [revealed, setRevealed] = useState(!blurredByDefault);
  const blur = revealed ? "blur(0) saturate(1)" : "blur(20px) saturate(.9)";

  return (
    <div className="relative h-[300px]">
      <div
        aria-hidden
        className="absolute inset-0 transition-[filter] duration-500"
        style={{
          filter: blur,
          background:
            "radial-gradient(120% 90% at 30% 25%, #5E6B86 0%, #384767 45%, #1A2744 100%)",
        }}
      />
      {photoUrl && (
        // Photo réelle par-dessus le dégradé (repli si absente). Le flou suit la
        // confidentialité « Découverte » exactement comme le fond.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-500"
          style={{ filter: blur }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E1422]/35 via-transparent to-[#0E1422]/85" />
      <span className="lbl absolute left-5 top-5 rounded-[20px] bg-[#0E1422]/40 px-2.5 py-1.5 text-[10px] text-white/70 backdrop-blur-sm safe-top">
        {t("profile.blurredDefault", { level: t("stages.DISCOVERY") })}
      </span>
      {/* Bouton discret, descendu dans la zone de photo (juste au-dessus du
          nom) et fondu dans le flou : il ne masque plus la photo et garde
          l'icone d'oeil, simplement affinee. */}
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="absolute bottom-[60px] right-4 z-10 flex items-center gap-1.5 rounded-full border border-white/25 bg-[#0E1422]/40 px-2.5 py-1.5 text-[12px] font-medium text-[#F2EFE8]/90 backdrop-blur-md transition-colors hover:bg-[#0E1422]/60"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        {revealed ? t("profile.hide") : t("profile.reveal")}
      </button>
      <div className="absolute bottom-5 left-5 right-5 flex items-center gap-2.5">
        <h1 className="font-display text-[32px] font-medium text-[#F8F6F0]">
          {displayName}
        </h1>
        {isVerified && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-label={t("common.verified")}
          >
            <path
              d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
              fill="#C9A84C"
            />
            <path
              d="M8.8 12l2.1 2.1 4.3-4.4"
              stroke="#131D33"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span className="text-base text-[#F8F6F0]/80">
          · {t("common.years", { age })}
        </span>
      </div>
    </div>
  );
}
