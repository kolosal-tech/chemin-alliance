"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  "Pasteur",
  "Prêtre",
  "Diacre",
  "Mentor de couple",
  "Conseiller chrétien",
  "Sœur consacrée",
];

export function CoachAdmin({ coaches }: { coaches: Coach[] }) {
  const router = useRouter();
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
    setBusy(false);
    if (res.ok) {
      setDisplayName("");
      setSpecialties("");
      setPrice("0");
      setBio("");
      setMsg("Accompagnateur ajouté.");
      router.refresh();
    } else {
      setMsg("Échec de l'ajout (vérifie les champs).");
    }
  }

  async function remove(id: string) {
    if (!confirm("Retirer cet accompagnateur ?")) return;
    const res = await fetch(`/api/admin/coaches/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const field =
    "w-full rounded-btnsm border border-sand-300 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#ECE7DD]";
  const label = "lbl mb-1 block text-[10px] text-gold-deep dark:text-gold-light";

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={add}
        className="rounded-cardlg border border-sand-200 bg-cream/70 p-5 dark:border-anthracite-600 dark:bg-anthracite-850/70"
      >
        <h2 className="mb-4 font-display text-lg text-night dark:text-[#ECE7DD]">
          Ajouter un accompagnateur humain
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <span className={label}>Nom affiché</span>
            <input
              className={field}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex. Pasteur Daniel Mercier"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={label}>Rôle / affiliation</span>
              <select
                className={field}
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>Prix / séance (€)</span>
              <input
                className={field}
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div>
            <span className={label}>
              Spécialités (séparées par des virgules)
            </span>
            <input
              className={field}
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="préparation au mariage, gestion de conflit, finances"
            />
          </div>
          <div>
            <span className={label}>Présentation (facultatif)</span>
            <textarea
              className={field}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Quelques mots sur son ministère et son accompagnement."
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink dark:text-[#CFCAC0]">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            Vérifié / certifié par la plateforme
          </label>
          <button
            type="submit"
            disabled={busy || displayName.trim().length < 2}
            className="mt-1 flex items-center justify-center gap-2 rounded-btnlg bg-navy px-4 py-3 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            {busy && <Spinner className="h-4 w-4" />}
            {busy ? "Ajout…" : "Ajouter l'accompagnateur"}
          </button>
          {msg && (
            <p className="text-[13.5px] text-gold-ink dark:text-[#E0C77A]">
              {msg}
            </p>
          )}
        </div>
      </form>

      <div>
        <h2 className="lbl mb-3 text-[10.5px] text-gold-deep dark:text-gold-light">
          Accompagnateurs · {coaches.length}
        </h2>
        <div className="flex flex-col gap-2.5">
          {coaches.length === 0 && (
            <p className="rounded-card border border-sand-200 bg-surface p-4 text-sm text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
              Aucun accompagnateur pour le moment.
            </p>
          )}
          {coaches.map((c) => (
            <article
              key={c.id}
              className="flex items-start gap-3 rounded-card border border-sand-200 bg-surface p-3.5 dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[17px] text-night dark:text-[#ECE7DD]">
                    {c.displayName}
                  </span>
                  {c.certified && (
                    <span className="rounded-[6px] bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold-ink dark:text-[#E0C77A]">
                      Vérifié
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[13.5px] text-sand-600 dark:text-[#7E7A72]">
                  {c.affiliation} · {c.pricePerSessionEUR} € / séance
                </div>
                {c.specialties.length > 0 && (
                  <div className="mt-1 text-[13px] text-warmgray dark:text-[#9A958B]">
                    {c.specialties.join(" · ")}
                  </div>
                )}
              </div>
              <AsyncButton
                onClick={() => remove(c.id)}
                className="flex-none rounded-btnsm border border-sand-300 px-3 py-1.5 text-[13px] text-warmgray hover:border-red-400 hover:text-red-500 dark:border-anthracite-600 dark:text-[#9A958B]"
              >
                Retirer
              </AsyncButton>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
