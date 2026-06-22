"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Bannière affichée aux membres dont l'email n'est pas encore vérifié.
 * Tant que `isVerified` est faux, le profil n'apparaît pas dans les suggestions
 * (cf. lib/matching) - sans cette bannière, l'utilisateur reste dans un cul-de-sac
 * silencieux. Bouton « renvoyer l'email ».
 */
export function VerifyBanner() {
  const t = useTranslations("auth");
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
    <div className="safe-top flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-info-border bg-info-surface px-4 py-2 text-center text-[12.5px] text-info-ink dark:border-info-darkBorder dark:bg-info-darkSurface dark:text-info-darkInk">
      <span>{t("verifyBanner")}</span>
      {state === "sent" ? (
        <span className="font-semibold text-sage">{t("verifyResent")}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="font-semibold underline underline-offset-2 disabled:opacity-60"
        >
          {state === "sending" ? t("verifySending") : t("verifyResend")}
        </button>
      )}
    </div>
  );
}
