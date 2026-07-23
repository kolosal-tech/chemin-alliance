"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { isConfirmedBlockResponse } from "@/lib/block-response";

/**
 * Bloquer une personne - GRATUIT À VIE, jamais derrière un paywall.
 * Confirmation douce, aucune raison demandée. Après blocage, retour à la liste
 * des messages (la conversation disparaît des deux côtés).
 *
 * Le modal est rendu via un PORTAIL vers document.body : l'en-tête de la
 * conversation porte `.glass` (backdrop-filter), qui crée un bloc de
 * confinement pour `position: fixed` - sans portail, le modal se rognerait
 * dans l'en-tête au lieu de couvrir l'écran.
 */
export function BlockButton({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName: string;
}) {
  const t = useTranslations("block");
  const tMessaging = useTranslations("messaging");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function block() {
    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!(await isConfirmedBlockResponse(response))) {
        toast.error(tMessaging("actionFailed"));
        return;
      }
      setOpen(false);
      router.push("/messages");
      router.refresh();
    } catch {
      toast.error(tMessaging("actionFailed"));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("block")}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-sand-300 text-warmgray transition-colors hover:border-danger/50 hover:text-danger dark:border-anthracite-600 dark:text-[#9A958B]"
      >
        {/* Personne bloquée (et non un panneau d'interdiction). */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            cx="10"
            cy="8"
            r="3.3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M4 19.3c0-3.2 2.7-5.3 6-5.3 1.1 0 2.2.3 3 .7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M16 15l4 4m0-4l-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <ConfirmDialog
        open={open}
        title={t("confirmTitle", { name: targetName })}
        body={t("confirmBody")}
        note={t("free")}
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        tone="danger"
        onConfirm={block}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
