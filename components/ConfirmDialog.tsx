"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";
import { AccessibleDialog } from "@/components/AccessibleDialog";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Libellé du bouton annuler (défaut : common.cancel). */
  cancelLabel?: string;
  /** Style destructif (rouge) pour les actions à perte. */
  tone?: "default" | "danger";
  /** Note complémentaire affichée sous le corps principal. */
  note?: string;
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
  note,
  onConfirm,
  onCancel,
}: Props) {
  const tc = useTranslations("common");
  const titleId = useId();
  const bodyId = useId();
  const [confirming, setConfirming] = useState(false);

  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;

  async function handleConfirm() {
    if (confirmingRef.current) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <AccessibleDialog
      open={open}
      onClose={onCancel}
      closeDisabled={confirming}
      labelledBy={titleId}
      describedBy={bodyId}
      panelClassName="w-full max-w-sm rounded-cardlg bg-surface p-5 shadow-cardfeat dark:bg-anthracite-800"
    >
      <h3
        id={titleId}
        className="font-display text-xl text-night dark:text-[#ECE7DD]"
      >
        {title}
      </h3>
      <p
        id={bodyId}
        className="mt-2 text-[16px] leading-normal text-warmgray dark:text-[#9A958B]"
      >
        {body}
      </p>
      {note && <p className="mt-2 text-[14px] text-sage">{note}</p>}
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
    </AccessibleDialog>
  );
}
