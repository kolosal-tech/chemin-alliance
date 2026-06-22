"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/Spinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

const inputCls =
  "rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]";
const labelCls = "lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]";
const btnCls =
  "rounded-btnsm bg-navy py-3 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900";

export function AccountPanel({
  currentEmail,
  isVerified,
}: {
  currentEmail: string;
  isVerified: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);

  const [eml, setEml] = useState({ newEmail: "", password: "" });
  const [emlBusy, setEmlBusy] = useState(false);

  // Identifiant = action sensible : on confirme avant d'exécuter (modale).
  const [confirm, setConfirm] = useState<null | "pwd" | "email">(null);

  function err(code: string | undefined, form: "pwd" | "email"): string {
    switch (code) {
      case "INVALID_CREDENTIALS":
        return t("account.error.wrongPassword");
      case "SAME_PASSWORD":
        return t("account.error.passwordSameAsCurrent");
      case "RATE_LIMITED":
        return t("account.error.rateLimited");
      case "EMAIL_TAKEN":
        return t("account.error.emailTaken");
      case "SAME_EMAIL":
      case "VALIDATION_ERROR":
        return form === "email"
          ? t("account.error.invalidEmail")
          : t("account.error.passwordRules");
      default:
        return t("account.error.general");
    }
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) {
      toast.error(t("account.error.passwordMismatch"));
      return;
    }
    setConfirm("pwd");
  }

  async function doPassword() {
    setPwdBusy(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.next,
        }),
      });
      if (res.ok) {
        toast.success(t("account.passwordSaved"));
        setPwd({ current: "", next: "", confirm: "" });
      } else {
        const code = (await res.json().catch(() => ({})))?.error;
        toast.error(err(code, "pwd"));
      }
    } catch {
      toast.error(err(undefined, "pwd"));
    } finally {
      setPwdBusy(false);
      setConfirm(null);
    }
  }

  function submitEmail(e: FormEvent) {
    e.preventDefault();
    setConfirm("email");
  }

  async function doEmail() {
    setEmlBusy(true);
    try {
      const res = await fetch("/api/me/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: eml.password,
          newEmail: eml.newEmail,
        }),
      });
      if (res.ok) {
        toast.success(t("account.emailVerificationSent"));
        setEml({ newEmail: "", password: "" });
      } else {
        const code = (await res.json().catch(() => ({})))?.error;
        toast.error(err(code, "email"));
      }
    } catch {
      toast.error(err(undefined, "email"));
    } finally {
      setEmlBusy(false);
      setConfirm(null);
    }
  }

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="mb-4 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("account.title")}
      </h1>

      {/* Changer le mot de passe */}
      <section className="mb-4 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="text-[15px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("account.passwordSection")}
        </div>
        <form onSubmit={submitPassword} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{t("account.currentPassword")}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={pwd.current}
              onChange={(e) =>
                setPwd((s) => ({ ...s, current: e.target.value }))
              }
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{t("account.newPassword")}</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={pwd.next}
              onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{t("account.confirmPassword")}</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={pwd.confirm}
              onChange={(e) =>
                setPwd((s) => ({ ...s, confirm: e.target.value }))
              }
              className={inputCls}
            />
          </label>
          <p className="text-[11.5px] text-sand-500 dark:text-[#7E7A72]">
            {t("account.passwordRules")}
          </p>
          <button
            type="submit"
            disabled={pwdBusy}
            className={`${btnCls} flex items-center justify-center gap-2`}
          >
            {pwdBusy && <Spinner className="h-4 w-4" />}
            {t("account.passwordSection")}
          </button>
        </form>
      </section>

      {/* Changer l'email */}
      <section className="mb-4 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="text-[15px] font-semibold text-night dark:text-[#ECE7DD]">
          {t("account.emailSection")}
        </div>
        <p className="mt-1 text-[12.5px] text-[#6B665C] dark:text-[#9A958B]">
          {t("account.currentEmail")} : {currentEmail}
          {!isVerified && ` · ${t("account.unverified")}`}
        </p>
        <form onSubmit={submitEmail} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{t("account.newEmail")}</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={eml.newEmail}
              onChange={(e) =>
                setEml((s) => ({ ...s, newEmail: e.target.value }))
              }
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{t("account.currentPassword")}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={eml.password}
              onChange={(e) =>
                setEml((s) => ({ ...s, password: e.target.value }))
              }
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={emlBusy}
            className={`${btnCls} flex items-center justify-center gap-2`}
          >
            {emlBusy && <Spinner className="h-4 w-4" />}
            {t("account.emailSection")}
          </button>
        </form>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === "email"
            ? t("account.emailConfirmTitle")
            : t("account.passwordConfirmTitle")
        }
        body={
          confirm === "email"
            ? t("account.emailConfirmBody")
            : t("account.passwordConfirmBody")
        }
        confirmLabel={t("common.confirm")}
        onConfirm={async () => {
          if (confirm === "pwd") await doPassword();
          else if (confirm === "email") await doEmail();
        }}
        onCancel={() => setConfirm(null)}
      />
    </main>
  );
}
