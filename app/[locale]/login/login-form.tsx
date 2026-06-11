"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";

export function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const verified = useSearchParams().get("verified");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/suggestions");
      router.refresh();
    } else if (res.status === 429) {
      setError(t("rateLimited"));
    } else {
      setError(t("errorCredentials"));
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center overflow-hidden px-7 safe-top safe-bottom">
      <SacredMotif variant="tree" className="right-[-110px] top-[-20px]" />
      <div className="mb-8 flex items-center gap-2.5">
        <span className="inline-block h-px w-[22px] bg-gold" aria-hidden />
        <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">{tc("appName")}</span>
      </div>
      <h1 className="font-display text-[32px] text-night dark:text-[#ECE7DD]">{t("loginTitle")}</h1>
      {verified && (
        <p className="mt-3 rounded-card border border-[#CFE0D4] bg-[#EAF0EB] px-4 py-3 text-[13.5px] text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
          {t("verified")}
        </p>
      )}
      <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">{t("password")}</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
          />
        </label>
        {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-btnlg bg-navy px-4 py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
        >
          {busy ? tc("loading") : t("login")}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-warmgray dark:text-[#9A958B]">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-gold-deep dark:text-gold-light">
          {t("register")}
        </Link>
      </p>
    </main>
  );
}
