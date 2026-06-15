"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { AllianceThread } from "@/components/AllianceThread";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tl = useTranslations("legal");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!fd.get("consentSensitive") || !fd.get("consentTerms")) {
      setError(t("errorConsentRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    const email = String(fd.get("email"));
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: fd.get("password"),
        displayName: fd.get("displayName"),
        age: Number(fd.get("age")),
        vertical: fd.get("vertical"),
        intent: fd.get("intent") || "discern",
        country: fd.get("country") || undefined,
        locale,
        consentSensitiveData: true,
        consentTerms: true,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSentTo(email);
    } else if (res.status === 409) {
      setError(t("errorEmailTaken"));
    } else if (res.status === 429) {
      setError(t("rateLimited"));
    } else {
      setError(tc("error"));
    }
  }

  if (sentTo) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-7 text-center safe-top safe-bottom">
        <h1 className="font-display text-[28px] text-night dark:text-[#ECE7DD]">
          {t("verifyTitle")}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-warmgray dark:text-[#9A958B]">
          {t("verifyBody", { email: sentTo })}
        </p>
        <Link
          href="/login"
          className="mt-8 font-semibold text-gold-deep dark:text-gold-light"
        >
          {t("login")}
        </Link>
      </main>
    );
  }

  const input =
    "rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-night p-14 lg:flex lg:flex-col lg:justify-between">
        <SacredMotif variant="olive" className="right-[-70px] top-[60px]" />
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="inline-block h-px w-[22px] bg-gold" />
          <span className="lbl text-[10px] text-gold">{tc("appName")}</span>
        </div>
        <h2 className="max-w-[16ch] font-display text-[44px] font-normal leading-[1.15] text-[#F4F1EA]">
          {tc("tagline")}
        </h2>
        <div className="dark max-w-md">
          <AllianceThread current={1} />
        </div>
      </aside>
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center overflow-hidden px-7 py-10 safe-top safe-bottom">
        <SacredMotif variant="olive" className="right-[-110px] top-[-30px]" />
        <h1 className="font-display text-[32px] text-night dark:text-[#ECE7DD]">
          {t("registerTitle")}
        </h1>
        <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5">
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
              {t("intentTitle")}
            </span>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-sand-400 bg-white p-3 transition-colors has-[:checked]:border-gold has-[:checked]:bg-[#FBF6E9] dark:border-anthracite-600 dark:bg-anthracite-700 dark:has-[:checked]:border-gold-light dark:has-[:checked]:bg-[#272117]">
                <input
                  name="intent"
                  type="radio"
                  value="discern"
                  defaultChecked
                  className="mt-0.5 h-4 w-4 accent-[#1A2744]"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink dark:text-[#ECE7DD]">
                    {t("intentDiscern")}
                  </span>
                  <span className="block text-[12px] leading-snug text-warmgray dark:text-[#9A958B]">
                    {t("intentDiscernHint")}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-[#BFD0E6] bg-[#EAF1F8] p-3 transition-colors has-[:checked]:border-navy has-[:checked]:bg-[#D7E4F2] dark:border-[#2A3550] dark:bg-[#161E2C] dark:has-[:checked]:border-[#5B73A8] dark:has-[:checked]:bg-[#1B2740]">
                <input
                  name="intent"
                  type="radio"
                  value="married"
                  className="mt-0.5 h-4 w-4 accent-[#1A2744]"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink dark:text-[#ECE7DD]">
                    {t("intentMarried")}
                  </span>
                  <span className="block text-[12px] leading-snug text-warmgray dark:text-[#9A958B]">
                    {t("intentMarriedHint")}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
              {t("displayName")}
            </span>
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={40}
              className={input}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
                {t("age")}
              </span>
              <input
                name="age"
                type="number"
                min={18}
                max={99}
                required
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
                {t("vertical")}
              </span>
              <select name="vertical" required className={input}>
                <option value="CHRISTIAN_EVANGELICAL">
                  {t("verticalEvangelical")}
                </option>
                <option value="CHRISTIAN_CATHOLIC">
                  {t("verticalCatholic")}
                </option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
              {t("country")}
            </span>
            <input
              name="country"
              maxLength={80}
              placeholder={t("countryHint")}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
              {t("email")}
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]">
              {t("password")} · {t("passwordHint")}
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className={input}
            />
          </label>
          <label className="flex items-start gap-3 text-[12.5px] leading-normal text-warmgray dark:text-[#9A958B]">
            <input
              name="consentSensitive"
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#1A2744]"
            />
            <span>{t("consentSensitive")}</span>
          </label>
          <label className="flex items-start gap-3 text-[12.5px] leading-normal text-warmgray dark:text-[#9A958B]">
            <input
              name="consentTerms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#1A2744]"
            />
            <span>{t("consentTerms")}</span>
          </label>
          <p className="text-[11.5px] text-sand-500 dark:text-[#65625B]">
            <Link href="/legal/terms" className="underline">
              {tl("terms")}
            </Link>
            {" · "}
            <Link href="/legal/privacy" className="underline">
              {tl("privacy")}
            </Link>
          </p>
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-btnlg bg-navy px-4 py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
          >
            {busy ? tc("loading") : t("register")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-warmgray dark:text-[#9A958B]">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-gold-deep dark:text-gold-light"
          >
            {t("login")}
          </Link>
        </p>
      </main>
    </div>
  );
}
