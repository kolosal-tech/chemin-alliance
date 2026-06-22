"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/Spinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

type Sponsor = { name: string; email: string; relation: string };
const RELATIONS = ["family", "pastor", "priest", "friend"] as const;

export function SponsorPanel({ initial }: { initial: Sponsor | null }) {
  const t = useTranslations("sponsor");
  const tc = useTranslations("common");
  const [sponsor, setSponsor] = useState<Sponsor | null>(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [relation, setRelation] = useState(initial?.relation ?? "family");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/me/sponsor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, relation }),
      });
      if (res.ok) {
        const d = (await res.json()) as { sponsor: Sponsor };
        setSponsor(d.sponsor);
        toast.success(t("saved"));
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/me/sponsor", { method: "DELETE" });
      if (res.ok) {
        setSponsor(null);
        setName("");
        setEmail("");
        setRelation("family");
        toast.success(t("removed"));
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  }

  const field =
    "rounded-btnsm border border-sand-400 bg-surface px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]";
  const lbl = "lbl text-[10.5px] text-sand-600 dark:text-[#9A958B]";

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("intro")}
      </p>
      <p className="mt-2.5 flex items-start gap-1.5 rounded-btn bg-sand-100 px-3 py-2 text-[13px] leading-snug text-sand-600 dark:bg-anthracite-700 dark:text-[#9A958B]">
        <span aria-hidden>🔒</span>
        <span>{t("privacyNote")}</span>
      </p>

      {sponsor ? (
        <section className="mt-4 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
          <span aria-hidden className="text-lg">
            🤝
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-night dark:text-[#ECE7DD]">
              {sponsor.name}
            </div>
            <div className="text-[13.5px] text-warmgray dark:text-[#9A958B]">
              {t(`relations.${sponsor.relation}`)} · {sponsor.email}
            </div>
          </div>
        </section>
      ) : (
        <p className="mt-4 text-[14px] text-warmgray dark:text-[#9A958B]">
          {t("none")}
        </p>
      )}

      <form onSubmit={save} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>{t("name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder={t("namePlaceholder")}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>{t("email")}</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>{t("relation")}</span>
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className={field}
          >
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {t(`relations.${r}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-1 flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-btnlg bg-navy px-4 py-3.5 text-[16px] font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
          >
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? tc("loading") : sponsor ? t("update") : t("save")}
          </button>
          {sponsor && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
              className="rounded-btnlg border border-sand-400 px-4 py-3.5 text-[16px] font-semibold text-warmgray disabled:opacity-60 dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("remove")}
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmRemove}
        title={t("removeConfirmTitle")}
        body={t("removeConfirmBody")}
        confirmLabel={t("remove")}
        tone="danger"
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
    </main>
  );
}
