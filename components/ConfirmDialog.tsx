"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Libellé du bouton annuler (défaut : common.cancel). */
  cancelLabel?: string;
  /** Style destructif (rouge) pour les actions à perte. */
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Modale de confirmation accessible et réutilisable :
 * - `role="dialog"` + `aria-modal` + titre/corps liés (aria-labelledby/describedby) ;
 * - focus déplacé dans la modale à l'ouverture, piégé (Tab/Shift+Tab), rendu à
 *   l'élément déclencheur à la fermeture ;
 * - fermeture clavier (Échap) et clic sur le fond - désactivés tant que l'action
 *   de confirmation est en cours (pas de fermeture en plein appel réseau) ;
 * - bouton de confirmation = AsyncButton (spinner + anti double-clic).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onCancel,
}: Props) {
  const tc = useTranslations("common");
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [confirming, setConfirming] = useState(false);

  // Handlers/état gardés en ref : l'effet focus/piège ne doit dépendre que de
  // `open`. Sinon une nouvelle identité d'`onCancel` (les appelants passent une
  // arrow inline) à chaque rendu parent relance l'effet et vole le focus.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const getFocusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    // Focus initial sur Annuler (choix non destructif par défaut).
    getFocusable()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmingRef.current) return; // pas de fermeture en plein appel
        e.preventDefault();
        onCancelRef.current();
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  async function handleConfirm() {
    if (confirmingRef.current) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 px-6"
      onClick={() => {
        if (!confirming) onCancel();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-cardlg bg-surface p-5 shadow-cardfeat dark:bg-anthracite-800"
      >
        <h3
          id={titleId}
          className="font-display text-xl text-night dark:text-[#ECE7DD]"
        >
          {title}
        </h3>
        <p
          id={bodyId}
          className="mt-2 text-[14.5px] leading-normal text-warmgray dark:text-[#9A958B]"
        >
          {body}
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-btnsm border border-sand-400 py-3 text-sm font-medium text-night disabled:opacity-50 dark:border-anthracite-600 dark:text-[#CFCAC0]"
          >
            {cancelLabel ?? tc("cancel")}
          </button>
          <AsyncButton
            onClick={handleConfirm}
            className={`flex-1 items-center justify-center rounded-btnsm py-3 text-sm font-semibold ${
              tone === "danger"
                ? "bg-danger text-white"
                : "bg-navy text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
            }`}
          >
            {confirmLabel}
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
