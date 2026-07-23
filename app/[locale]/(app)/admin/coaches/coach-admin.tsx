"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";
import { Spinner } from "@/components/Spinner";

type Coach = {
  id: string;
  displayName: string;
  affiliation: string;
  certified: boolean;
  specialties: string[];
  pricePerSessionEUR: number;
  bio: string | null;
};

const ROLES = [
  { value: "Pasteur", key: "pastor" },
  { value: "Prêtre", key: "priest" },
  { value: "Diacre", key: "deacon" },
  { value: "Mentor de couple", key: "coupleMentor" },
  { value: "Conseiller chrétien", key: "christianCounselor" },
  { value: "Sœur consacrée", key: "consecratedSister" },
] as const;

export function CoachAdmin({ coaches }: { coaches: Coach[] }) {
  const t = useTranslations("admin.coach");
  const router = useRouter();
  const displayNameId = useId();
  const affiliationId = useId();
  const priceId = useId();
  const specialtiesId = useId();
  const bioId = useId();
  const [displayName, setDisplayName] = useState("");
  const [affiliation, setAffiliation] = useState("Pasteur");
  const [specialties, setSpecialties] = useState("");
  const [price, setPrice] = useState("0");
  const [certified, setCertified] = useState(true);
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy || displayName.trim().length < 2) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          affiliation,
          certified,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          pricePerSessionEUR: Math.max(0, parseInt(price || "0", 10) || 0),
          bio: bio.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("coach_add_failed");
      setDisplayName("");
      setSpecialties("");
      setPrice("0");
      setBio("");
      setMsg(t("added"));
      router.refresh();
    } catch {
      setMsg(t("addError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("removeConfirm"))) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/coaches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("coach_remove_failed");
      router.refresh();
    } catch {
      setMsg(t("removeError"));
    }
  }

  const field =
    "w-full rounded-btnsm border border-sand-300 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#ECE7DD]";
  const label =
    "lbl mb-1 block text-[11px] text-gold-deep dark:text-gold-light";

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={add}
        className="rounded-cardlg border border-sand-200 bg-cream/70 p-5 dark:border-anthracite-600 dark:bg-anthracite-850/70"
      >
        <h2 className="mb-4 font-display text-lg text-night dark:text-[#ECE7DD]">
          {t("addTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className={label} htmlFor={displayNameId}>
              {t("displayName")}
            </label>
            <input
              id={displayNameId}
              className={field}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor={affiliationId}>
                {t("affiliation")}
              </label>
              <select
                id={affiliationId}
                className={field}
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {t(`roles.${role.key}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor={priceId}>
                {t("price")}
              </label>
              <input
                id={priceId}
                className={field}
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={label} htmlFor={specialtiesId}>
              {t("specialties")}
            </label>
            <input
              id={specialtiesId}
              className={field}
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder={t("specialtiesPlaceholder")}
            />
          </div>
          <div>
            <label className={label} htmlFor={bioId}>
              {t("bio")}
            </label>
            <textarea
              id={bioId}
              className={field}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bioPlaceholder")}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink dark:text-[#CFCAC0]">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            {t("certified")}
          </label>
          <button
            type="submit"
            disabled={busy || displayName.trim().length < 2}
            className="mt-1 flex items-center justify-center gap-2 rounded-btnlg bg-navy px-3 py-3 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? t("adding") : t("add")}
          </button>
          {msg && (
            <p
              role="status"
              aria-live="polite"
              className="text-[15px] text-gold-ink dark:text-[#E0C77A]"
            >
              {msg}
            </p>
          )}
        </div>
      </form>

      <div>
        <h2 className="lbl mb-3 text-[12px] text-gold-deep dark:text-gold-light">
          {t("listTitle")} · {coaches.length}
        </h2>
        <div className="flex flex-col gap-2.5">
          {coaches.length === 0 && (
            <p className="rounded-card border border-sand-200 bg-surface p-4 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
              {t("empty")}
            </p>
          )}
          {coaches.map((c) => (
            <article
              key={c.id}
              className="flex items-start gap-3 rounded-card border border-sand-200 bg-surface p-3.5 dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[19px] text-night dark:text-[#ECE7DD]">
                    {c.displayName}
                  </span>
                  {c.certified && (
                    <span className="rounded-[6px] bg-gold/20 px-2 py-0.5 text-[12px] font-semibold text-gold-ink dark:text-[#E0C77A]">
                      {t("verified")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[15px] text-sand-600 dark:text-[#8F8A80]">
                  {c.affiliation} · {c.pricePerSessionEUR} € / {t("session")}
                </div>
                {c.specialties.length > 0 && (
                  <div className="mt-1 text-[15px] text-warmgray dark:text-[#9A958B]">
                    {c.specialties.join(" · ")}
                  </div>
                )}
              </div>
              <AsyncButton
                onClick={() => remove(c.id)}
                className="flex-none rounded-btnsm border border-sand-300 px-3 py-1.5 text-[15px] text-warmgray hover:border-red-400 hover:text-red-500 dark:border-anthracite-600 dark:text-[#9A958B]"
              >
                {t("remove")}
              </AsyncButton>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
