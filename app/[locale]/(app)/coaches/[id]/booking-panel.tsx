"use client";

import { useTranslations } from "next-intl";

export function BookingPanel() {
  const t = useTranslations("coaches");

  return (
    <section
      aria-labelledby="booking-unavailable-title"
      data-testid="booking-unavailable"
      className="mb-6 rounded-cardlg border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800"
    >
      <h2
        id="booking-unavailable-title"
        className="font-display text-lg text-night dark:text-[#ECE7DD]"
      >
        {t("marketplaceUnavailableTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("marketplaceUnavailableBody")}
      </p>
    </section>
  );
}
