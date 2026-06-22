"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";

type State = {
  phone: string | null;
  verified: boolean;
  smsConfigured: boolean;
};

/**
 * Vérification du numéro de téléphone (anti-bot) - GRATUITE.
 * Tant qu'aucun prestataire SMS n'est configuré (smsConfigured=false), le flux
 * est masqué (mention « bientôt ») pour ne pas afficher une UX non fonctionnelle.
 */
export function PhoneVerify() {
  const t = useTranslations("phone");
  const [st, setSt] = useState<State | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "sent">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/phone")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setSt(d);
          if (d.phone) setPhone(d.phone);
        }
      })
      .catch(() => {});
  }, []);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me/phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setBusy(false);
    if (res.ok) setStep("sent");
    else setError(t("invalidPhone"));
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me/phone", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (res.ok) setSt((s) => (s ? { ...s, verified: true } : s));
    else setError(t("invalidCode"));
  }

  if (!st) return null;

  return (
    <section className="mt-6">
      <h2 className="lbl mb-2 text-[9.5px] text-gold-deep dark:text-gold-light">
        {t("title")}
      </h2>
      <div className="rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        {st.verified ? (
          <p className="flex items-center gap-2 text-[13.5px] text-sage">
            <span aria-hidden>✓</span> {t("verified")} ({st.phone})
          </p>
        ) : !st.smsConfigured ? (
          <p className="text-[13px] text-warmgray dark:text-[#9A958B]">
            {t("comingSoon")}
          </p>
        ) : step === "idle" ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px] leading-snug text-warmgray dark:text-[#9A958B]">
              {t("intro")}
            </p>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className="rounded-btn border border-sand-300 bg-surface p-3 text-sm text-ink outline-none dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <AsyncButton
              disabled={busy || phone.trim().length < 8}
              onClick={send}
              className="rounded-btnsm bg-navy py-3 text-sm font-semibold text-navy-foreground disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("sendCode")}
            </AsyncButton>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px] leading-snug text-warmgray dark:text-[#9A958B]">
              {t("sentTo", { phone })}
            </p>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="rounded-btn border border-sand-300 bg-surface p-3 text-center font-mono text-lg tracking-[0.4em] text-ink outline-none dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <AsyncButton
              disabled={busy || code.length !== 6}
              onClick={verify}
              className="rounded-btnsm bg-navy py-3 text-sm font-semibold text-navy-foreground disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("verify")}
            </AsyncButton>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="py-1 text-center text-[12px] text-warmgray underline dark:text-[#9A958B]"
            >
              {t("change")}
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}
      </div>
    </section>
  );
}
