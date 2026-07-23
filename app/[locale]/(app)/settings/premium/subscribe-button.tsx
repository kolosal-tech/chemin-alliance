"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { safeStripeRedirectUrl } from "@/lib/payments/redirect";

/**
 * Action sensible (paiement). Demande une confirmation explicite, montre une
 * moulinette pendant l'ouverture du checkout (via le bouton de la modale) et
 * signale toute erreur par un toast plutôt qu'un silence.
 */
export function SubscribeButton({ label }: { label: string }) {
  const locale = useLocale();
  const t = useTranslations();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  async function go() {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    const redirect = safeStripeRedirectUrl(data?.url, "checkout");
    if (res?.ok && redirect) {
      // Redirection vers Stripe : on quitte l'app, pas de toast de succès.
      window.location.href = redirect;
    } else {
      toast.error(t("premium.checkoutError"));
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-4 w-full rounded-btnlg bg-gold py-4 text-base font-semibold text-night"
      >
        {label}
      </button>
      <ConfirmDialog
        open={confirming}
        title={t("premium.confirmTitle")}
        body={t("premium.confirmBody")}
        confirmLabel={t("premium.confirmCta")}
        onConfirm={go}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
