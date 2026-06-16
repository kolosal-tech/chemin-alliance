"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Types de signaux connus (alignés sur watchman + i18n antiScam.signalLabel).
const KNOWN_SIGNALS = new Set([
  "money_request",
  "spiritual_manipulation",
  "marriage_pressure",
  "urgency_rush",
  "explicit_content",
  "inheritance_lottery",
  "gift_card_crypto",
  "fake_identity",
  "off_platform_push",
  "sob_story",
]);

// Bannière anti-arnaque affichée dans une conversation quand le Veilleur a
// repéré des signaux de sévérité haute. Ton ferme mais non accusateur.
export function SafetyBanner({ matchId }: { matchId: string }) {
  const t = useTranslations();
  const [signals, setSignals] = useState<string[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/safety-signal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.flagged) {
          setSignals(
            (d.signals ?? []).filter((x: string) => KNOWN_SIGNALS.has(x)),
          );
        }
      })
      .catch(() => {});
  }, [matchId]);

  if (!signals || dismissed) return null;

  return (
    <div className="mx-3 mt-3 rounded-card border border-[#D8B6B0] bg-[#FBF0EE] p-4 dark:border-[#5A3A34] dark:bg-[#2A1B18]">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="text-lg">
          ⚠️
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[#9A3B30] dark:text-[#E0A99F]">
            {t("antiScam.bannerTitle")}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#7A4036] dark:text-[#D2A99F]">
            {t("antiScam.bannerBody")}
          </p>
          {signals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {signals.map((s) => (
                <span
                  key={s}
                  className="rounded-[6px] bg-[#F4D9D4] px-2 py-0.5 text-[10.5px] font-semibold text-[#9A3B30] dark:bg-[#3A201C] dark:text-[#E0A99F]"
                >
                  {t(`antiScam.signalLabel.${s}`)}
                </span>
              ))}
            </div>
          )}
          <Link
            href="/safety"
            className="mt-2 inline-block text-[11.5px] font-semibold text-[#9A3B30] underline dark:text-[#E0A99F]"
          >
            {t("antiScam.learnMore")}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t("antiScam.dismiss")}
          className="flex-none text-[#9A3B30] dark:text-[#E0A99F]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
