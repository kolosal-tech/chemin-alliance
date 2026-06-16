"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Ouvre le Stripe Billing Portal pour gérer / annuler l'abonnement. */
export function PortalButton({ label }: { label: string }) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function go() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="mt-3 w-full rounded-btnlg border border-gold/50 py-3.5 text-sm font-semibold text-gold-ink disabled:opacity-50 dark:text-gold-light"
      >
        {label}
      </button>
      {error && (
        <p className="mt-2 text-center text-[12px] text-[#9A3B30] dark:text-[#E0A99F]">
          {t("premium.manageError")}
        </p>
      )}
    </>
  );
}
