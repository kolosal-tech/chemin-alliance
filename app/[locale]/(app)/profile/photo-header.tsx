"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function PhotoHeader({
  displayName,
  age,
  isVerified,
  blurredByDefault,
}: {
  displayName: string;
  age: number;
  isVerified: boolean;
  blurredByDefault: boolean;
}) {
  const t = useTranslations();
  const [revealed, setRevealed] = useState(!blurredByDefault);

  return (
    <div className="relative h-[300px]">
      <div
        aria-hidden
        className="absolute inset-0 transition-[filter] duration-500"
        style={{
          filter: revealed ? "blur(0) saturate(1)" : "blur(20px) saturate(.9)",
          background:
            "radial-gradient(120% 90% at 30% 25%, #5E6B86 0%, #384767 45%, #1A2744 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E1422]/35 via-transparent to-[#0E1422]/85" />
      <span className="lbl absolute left-5 top-5 rounded-[20px] bg-[#0E1422]/40 px-2.5 py-1.5 text-[9px] text-white/70 backdrop-blur-sm safe-top">
        {t("profile.blurredDefault", { level: t("stages.DISCOVERY") })}
      </span>
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="absolute right-5 top-4 flex items-center gap-1.5 rounded-[20px] border border-white/40 bg-[#0E1422]/45 px-3.5 py-2 text-xs font-medium text-[#F2EFE8] backdrop-blur-md safe-top"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        {revealed ? t("profile.hide") : t("profile.reveal")}
      </button>
      <div className="absolute bottom-5 left-5 right-5 flex items-center gap-2.5">
        <h1 className="font-display text-[32px] font-medium text-[#F8F6F0]">{displayName}</h1>
        {isVerified && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-label={t("common.verified")}>
            <path d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z" fill="#C9A84C" />
            <path d="M8.8 12l2.1 2.1 4.3-4.4" stroke="#131D33" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="text-base text-[#F8F6F0]/80">· {t("common.years", { age })}</span>
      </div>
    </div>
  );
}
