"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { Spinner } from "@/components/Spinner";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: fd.get("email") }),
    });
    setBusy(false);
    // Toujours « envoyé » : aucune fuite sur l'existence du compte.
    setSent(true);
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center overflow-hidden px-7 safe-top safe-bottom">
      <SacredMotif variant="tree" className="right-[-110px] top-[-20px]" />
      <div className="mb-8 flex items-center gap-2.5">
        <span className="inline-block h-px w-[22px] bg-gold" aria-hidden />
        <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
          {tc("appName")}
        </span>
      </div>
      <h1 className="font-display text-[32px] text-night dark:text-[#ECE7DD]">
        {t("forgotTitle")}
      </h1>
      {sent ? (
        <p className="mt-5 rounded-card border border-[#CFE0D4] bg-[#EAF0EB] px-4 py-3 text-[13.5px] leading-relaxed text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("forgotSent")}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t("forgotIntro")}
          </p>
          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
                {t("email")}
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="rounded-btnsm border border-sand-400 bg-surface px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-btnlg bg-navy px-4 py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
            >
              {busy && <Spinner className="h-4 w-4" />}
              {busy ? tc("loading") : t("forgotSubmit")}
            </button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-warmgray dark:text-[#9A958B]">
        <Link
          href="/login"
          className="font-semibold text-gold-deep dark:text-gold-light"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </main>
  );
}
