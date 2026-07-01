"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * « Moment d'alliance » - temps fort, sobre et lumineux, affiché quand une
 * alliance devient mutuelle (acceptation d'une demande). Notre équivalent du
 * « match » des concurrents, à notre façon : nuit + halo doré + monogramme.
 * Sans état serveur : monté ponctuellement par l'appelant.
 */
export function AllianceMoment({
  name,
  onContinue,
  onLater,
}: {
  name: string;
  onContinue: () => void;
  onLater?: () => void;
}) {
  const t = useTranslations("messaging");
  const initial = (name.trim()[0] ?? "✦").toUpperCase();
  const ref = useRef<HTMLDivElement>(null);

  // Handlers gardés en ref : l'effet focus/piège ne doit dépendre que du
  // montage du composant (pas de prop `open`, ce composant est monté/démonté
  // par l'appelant). Une nouvelle identité de callback à chaque rendu parent
  // ne doit pas relancer l'effet ni voler le focus.
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;
  const onLaterRef = useRef(onLater);
  onLaterRef.current = onLater;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const getFocusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    getFocusable()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        // Pas de bouton "annuler" garanti (onLater optionnel) : Echap ferme
        // via onLater si présent, sinon via onContinue (seul chemin de
        // fermeture toujours disponible).
        (onLaterRef.current ?? onContinueRef.current)();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t("momentLabel")}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-night/70 p-5 backdrop-blur-sm"
    >
      <style>{`
        @keyframes caAllianceIn { from { opacity:0; transform: translateY(8px) scale(.97) } to { opacity:1; transform:none } }
        @media (prefers-reduced-motion: reduce) { .ca-alliance-in { animation: none !important } }
      `}</style>
      <div
        className="ca-alliance-in relative w-full max-w-sm overflow-hidden rounded-cardlg border border-[#2A3550] bg-gradient-to-b from-[#16223C] to-[#0E1526] px-7 pb-7 pt-9 text-center text-[#F2EEE4]"
        style={{ animation: "caAllianceIn .45s ease-out" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[20%] -top-[35%] h-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(216,184,96,.32), transparent 60%)",
          }}
        />

        <div className="relative mb-1 flex items-center justify-center">
          <span
            className="z-10 -mr-5 flex h-[78px] w-[78px] items-center justify-center rounded-full border-2 border-gold/70 font-display text-[34px]"
            style={{
              background:
                "radial-gradient(110% 90% at 40% 30%, #8A7A6A 0%, #5C4D44 50%, #352A28 100%)",
            }}
          >
            {initial}
          </span>
          <span
            className="-ml-5 flex h-[78px] w-[78px] items-center justify-center rounded-full border-2 border-gold/70"
            style={{
              background:
                "radial-gradient(110% 90% at 35% 25%, #6E7790 0%, #41506E 50%, #222F4C 100%)",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                className="fill-gold-light"
              />
            </svg>
          </span>
        </div>

        <span className="lbl mt-4 block text-[12px] text-gold-light">
          {t("momentLabel")}
        </span>
        <h2 className="mt-1.5 font-display text-[30px] font-medium leading-tight">
          {name}
        </h2>
        <p className="mx-auto mt-2.5 max-w-[30ch] text-[16px] leading-relaxed text-[#B9C0CE]">
          {t("momentBody")}
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-btnlg bg-gold py-3.5 text-[18px] font-bold text-night transition-colors hover:bg-gold-light"
        >
          {t("momentCta")}
        </button>
        {onLater && (
          <button
            type="button"
            onClick={onLater}
            className="mt-2.5 text-[16px] text-[#8C93A2] hover:text-[#B9C0CE]"
          >
            {t("momentLater")}
          </button>
        )}
      </div>
    </div>
  );
}
