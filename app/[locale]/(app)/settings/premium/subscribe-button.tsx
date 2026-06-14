"use client";

import { useState } from "react";

/** Lance le checkout Stripe et redirige vers la page de paiement. */
export function SubscribeButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (data?.url) {
      window.location.href = data.url;
    } else {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="mt-4 w-full rounded-btnlg bg-gold py-4 text-base font-semibold text-night disabled:opacity-50"
    >
      {label}
    </button>
  );
}
