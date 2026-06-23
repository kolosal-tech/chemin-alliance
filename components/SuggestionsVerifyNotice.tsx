"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Carte d'etat vide ciblee : quand la liste de suggestions est vide UNIQUEMENT
 * parce que l'email n'est pas verifie (lib/matching renvoie [] tant que
 * !isVerified), on explique la vraie cause et on propose un renvoi, au lieu du
 * generique "pas de suggestion aujourd'hui" qui se lit a tort "tu es a jour".
 */
export function SuggestionsVerifyNotice() {
  const t = useTranslations();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function resend() {
    if (state === "sending") return;
    setState("sending");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
    }).catch(() => null);
    setState(res && res.ok ? "sent" : "idle");
  }

  return (
    <div className="rounded-card border border-info-border bg-info-surface p-5 dark:border-info-darkBorder dark:bg-info-darkSurface lg:col-span-3">
      <h2 className="font-display text-lg text-info-ink dark:text-info-darkInk">
        {t("suggestions.blockedVerifyTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-info-ink dark:text-info-darkInk">
        {t("suggestions.blockedVerifyBody")}
      </p>
      {state === "sent" ? (
        <p className="mt-4 text-[16px] font-semibold text-sage">
          {t("auth.verifyResent")}
        </p>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="mt-4 inline-flex items-center gap-1.5 rounded-btnsm bg-navy px-3 py-2.5 text-[16px] font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
        >
          {state === "sending"
            ? t("auth.verifySending")
            : t("auth.verifyResend")}
        </button>
      )}
    </div>
  );
}
