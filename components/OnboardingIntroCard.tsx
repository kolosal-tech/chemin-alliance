"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SacredMotif } from "@/components/SacredMotif";
import { Icon } from "@/components/marketing/icons";
import { journeySteps } from "@/content/home";

/**
 * Carte d'onboarding (Phase 2) — affichée sur /suggestions quand le gate est ON
 * et que l'onboarding n'est pas encore fait. Le bouton marque le flag persistant
 * via `POST /api/me/onboarding-done`, puis rafraîchit la page (le gate retombe).
 * `onDone` permet une variante sans réseau (vitrine design-system).
 */
export function OnboardingIntroCard({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("phase2.intro");
  const tj = useTranslations("home.journey.steps");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markDone() {
    if (onDone) {
      onDone();
      return;
    }
    setLoading(true);
    try {
      // fetch ne rejette PAS sur 429/4xx/5xx : il faut tester res.ok, sinon on
      // rafraîchirait alors que le flag n'a pas été posé (gate persistant + bouton
      // figé). Sur échec : on réactive le bouton, pas de refresh.
      const res = await fetch("/api/me/onboarding-done", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      // Succès : la page se rafraîchit → le composant se démonte (gate retombe).
      // On ne reset PAS loading (évite un flash actif avant le démontage).
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-cardlg border border-sand-200 bg-surface p-6 dark:border-anthracite-600 dark:bg-anthracite-800 sm:p-8">
      <SacredMotif
        variant="dove"
        className="-right-12 -top-8 hidden sm:block"
      />
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-gold/15 text-gold-deep dark:text-gold-light">
        <Icon name="sparkle" className="h-6 w-6" strokeWidth={1.7} />
      </span>
      <h2 className="mt-5 font-display text-2xl text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("body")}
      </p>

      <p className="lbl mt-6 text-[10px] text-gold-deep dark:text-gold-light">
        {t("stepsLabel")}
      </p>
      <ol className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {journeySteps.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2.5 text-[14px] text-night dark:text-[#ECE7DD]"
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy/8 text-[11px] font-bold text-navy dark:bg-gold-light/10 dark:text-gold-light">
              {s.n}
            </span>
            {tj(`${s.id}.title`)}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={markDone}
        disabled={loading}
        className="mt-7 inline-flex items-center gap-1.5 rounded-btn bg-navy px-6 py-3.5 text-[14px] font-semibold text-[#F4F1EA] transition-colors hover:bg-night disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900 dark:hover:bg-gold"
      >
        {t("cta")}
        <Icon name="arrowRight" className="h-4 w-4" strokeWidth={1.9} />
      </button>
    </section>
  );
}
