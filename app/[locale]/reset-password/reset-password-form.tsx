"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { Spinner } from "@/components/Spinner";

export function ResetPasswordForm({ token: tokenProp }: { token?: string } = {}) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  // Token en segment de chemin (nouveau lien, sans `=`) prioritaire ; repli sur
  // `?token=` (liens déjà envoyés). useSearchParams toujours appelé (règle des
  // hooks), mais le prop l'emporte. Évite la corruption quoted-printable du `=`.
  const queryToken = useSearchParams().get("token") ?? "";
  const token = tokenProp || queryToken;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password !== String(fd.get("confirm") ?? "")) {
      setError(t("resetMismatch"));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1600);
      return;
    }
    if (res.status === 429) {
      setError(t("rateLimited"));
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    // 400 VALIDATION_ERROR = mot de passe trop faible ; sinon jeton invalide/expiré.
    setError(
      data.error === "VALIDATION_ERROR" ? t("passwordWeak") : t("resetInvalid"),
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center overflow-hidden px-7 safe-top safe-bottom">
      <SacredMotif variant="tree" className="right-[-110px] top-[-20px]" />
      <div className="mb-8 flex items-center gap-2.5">
        <span className="inline-block h-px w-[22px] bg-gold" aria-hidden />
        <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
          {tc("appName")}
        </span>
      </div>
      <h1 className="font-display text-[36px] text-night dark:text-[#ECE7DD]">
        {t("resetTitle")}
      </h1>
      {done ? (
        <p className="mt-5 rounded-card border border-[#CFE0D4] bg-[#EAF0EB] px-4 py-3 text-[16px] leading-relaxed text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("resetDone")}
        </p>
      ) : !token ? (
        <p className="mt-5 rounded-card border border-[#E6C9C9] bg-[#F6EAEA] px-4 py-3 text-[16px] leading-relaxed text-[#7A2E2E] dark:border-[#4A2E2E] dark:bg-[#2A1B1B] dark:text-[#C79F9F]">
          {t("resetInvalid")}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t("resetIntro")}
          </p>
          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="lbl text-[12px] text-sand-600 dark:text-[#9A958B]">
                {t("newPassword")}
              </span>
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="rounded-btnsm border border-sand-400 bg-surface px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
              />
              <span className="text-[14px] text-warmgray dark:text-[#8B8579]">
                {t("passwordHint")}
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="lbl text-[12px] text-sand-600 dark:text-[#9A958B]">
                {t("confirmPassword")}
              </span>
              <input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                className="rounded-btnsm border border-sand-400 bg-surface px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
              />
            </label>
            {error && (
              <p role="alert" className="text-[16px] text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-btnlg bg-navy px-4 py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
            >
              {busy && <Spinner className="h-4 w-4" />}
              {busy ? tc("loading") : t("resetSubmit")}
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
