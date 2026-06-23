"use client";

import { useTranslations } from "next-intl";

// Frontière d'erreur de la route coachs (App Router) : si le chargement échoue,
// on montre un message clair + un bouton « Réessayer » (reset relance le rendu
// du segment serveur) plutôt qu'un écran blanc ou une 500.
export default function CoachesError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations("coaches");
  const tc = useTranslations("common");
  return (
    <main
      className="px-3 pt-6 safe-top lg:mx-auto lg:max-w-4xl"
      data-testid="coaches-error"
    >
      <h1 className="mb-4 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <div
        role="alert"
        className="rounded-cardlg border border-sand-200 bg-surface p-6 text-center dark:border-anthracite-600 dark:bg-anthracite-800"
      >
        <p className="text-sm text-warmgray dark:text-[#9A958B]">
          {t("error")}
        </p>
        <button
          type="button"
          onClick={reset}
          data-testid="coaches-retry"
          className="mt-4 rounded-btnsm bg-navy px-3 py-2.5 text-[16px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
        >
          {tc("retry")}
        </button>
      </div>
    </main>
  );
}
