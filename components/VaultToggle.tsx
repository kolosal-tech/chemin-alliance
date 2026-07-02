"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setVaultLock, type VaultField } from "@/app/actions/vault";
import { useToast } from "@/components/Toast";

type Props = {
  field: VaultField;
  locked: boolean;
};

/** Cadenas sobre, ouvert/fermé selon l'état - pas d'emoji, trait fin cohérent avec les autres icônes inline du panel. */
function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      {/* Anse fermée (verrouillé) ou entrouverte (déverrouillé). */}
      <path
        d={locked ? "M8 11V8a4 4 0 0 1 8 0v3" : "M8 11V8a4 4 0 0 1 7.2-2.4"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Coffre-fort d'un champ sensible (église, témoignage, enfants) : verrouiller
 * remet la colonne de visibilité à PRIVATE (jamais exposée) ; déverrouiller la
 * remet à son niveau progressif par défaut. État optimiste avec rollback si la
 * Server Action échoue.
 */
export function VaultToggle({ field, locked }: Props) {
  const t = useTranslations("vault");
  const toast = useToast();
  const [isLocked, setIsLocked] = useState(locked);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isLocked;
    const prev = isLocked;
    setIsLocked(next); // optimiste
    startTransition(async () => {
      const res = await setVaultLock(field, next);
      if (!res.ok) {
        setIsLocked(prev); // rollback
        toast.error(t("error"));
        return;
      }
      toast.success(next ? t("lockedToast") : t("unlockedToast"));
    });
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-card border border-sand-200 bg-surface px-3 py-2.5 dark:border-anthracite-600 dark:bg-anthracite-800">
      <div className="flex items-center gap-2.5">
        <span
          className={
            isLocked
              ? "flex-none text-gold-deep dark:text-gold-light"
              : "flex-none text-warmgray dark:text-[#9A958B]"
          }
        >
          <LockIcon locked={isLocked} />
        </span>
        <div>
          <div className="text-[14px] font-medium text-night dark:text-[#ECE7DD]">
            {isLocked ? t("lock") : t("unlock")}
          </div>
          {isLocked && (
            <p className="text-[12px] leading-snug text-warmgray dark:text-[#9A958B]">
              {t("lockedHint")}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isLocked}
        aria-label={isLocked ? t("unlock") : t("lock")}
        disabled={isPending}
        onClick={toggle}
        className={`relative inline-flex h-[24px] w-[42px] flex-none items-center rounded-full border backdrop-blur-md transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold/50 focus-visible:ring-offset-surface disabled:opacity-50 dark:focus-visible:ring-offset-anthracite-800 ${
          isLocked
            ? "border-gold/50 bg-gold/85 dark:border-gold-light/50 dark:bg-gold-light/70"
            : "border-[#7E7363]/30 bg-[#968C78]/30 dark:border-white/15 dark:bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
            isLocked ? "translate-x-[21px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}
