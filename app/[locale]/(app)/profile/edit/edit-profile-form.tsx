"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  COUNTRIES,
  DENOMINATIONS,
  ENGAGEMENT_FREQUENCIES,
  INTERESTS,
  PERSONALITY_TRAITS,
  DENOMINATION_LABELS,
  ENGAGEMENT_LABELS,
  INTEREST_LABELS,
  PERSONALITY_LABELS,
  optionLabel,
  countryLabel,
  type Locale,
} from "@/lib/profile-options";
import { Spinner } from "@/components/Spinner";

type Data = {
  displayName: string;
  cityApprox: string;
  country: string;
  photoBlurredByDefault: boolean;
  denomination: string;
  ministry: string;
  engagementFrequency: string;
  localChurch: string;
  testimony: string;
  intentionStatement: string;
  familyVision: string;
  wantsChildren: "yes" | "no" | "";
  maritalStatus:
    | "single"
    | "widowed"
    | "divorced"
    | "single_parent"
    | "engaged"
    | "married"
    | "";
  hasChildren: "yes" | "no" | "";
  interests: string;
  personality: string;
  aspirations: string;
};

const EMPTY: Data = {
  displayName: "",
  cityApprox: "",
  country: "",
  photoBlurredByDefault: true,
  denomination: "",
  ministry: "",
  engagementFrequency: "",
  localChurch: "",
  testimony: "",
  intentionStatement: "",
  familyVision: "",
  wantsChildren: "",
  maritalStatus: "",
  hasChildren: "",
  interests: "",
  personality: "",
  aspirations: "",
};

// Champs « simples » servis par un menu déroulant ou des puces (cf.
// lib/profile-options). Stockés comme chaînes ; les valeurs libres héritées sont
// préservées (ajoutées à la liste au chargement).
const csvToList = (v: string): string[] =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function EditProfileForm({ photoEnabled }: { photoEnabled: boolean }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  // Saison de vie : les fiancés/mariés (espace couple, hors matching) ne voient
  // pas les questions orientées rencontre (statut matrimonial déjà fixé).
  const [season, setSeason] = useState<string | null>(null);

  async function onPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/me/photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload");
      const j = (await res.json()) as { photoUrl: string };
      setPhotoUrl(j.photoUrl);
      router.refresh();
    } catch {
      setError(t("photoError"));
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  }

  const load = useCallback(() => {
    setLoadFailed(false);
    fetch("/api/me")
      .then((r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((u) => {
        const f = u.faithProfile ?? {};
        const rel = u.relationshipProfile ?? {};
        setD({
          ...EMPTY,
          displayName: u.displayName ?? "",
          cityApprox: u.cityApprox ?? "",
          country: u.country ?? "",
          photoBlurredByDefault: u.photoBlurredByDefault ?? true,
          denomination: f.denomination ?? "",
          ministry: f.ministry ?? "",
          engagementFrequency: f.engagementFrequency ?? "",
          localChurch: f.localChurch ?? "",
          testimony: f.testimony ?? "",
          intentionStatement: rel.intentionStatement ?? "",
          familyVision: rel.familyVision ?? "",
          wantsChildren:
            rel.wantsChildren === true
              ? "yes"
              : rel.wantsChildren === false
                ? "no"
                : "",
          maritalStatus: rel.maritalStatus ?? "",
          hasChildren: rel.hasChildren ? "yes" : "no",
          interests: rel.interests ?? "",
          personality: rel.personality ?? "",
          aspirations: rel.aspirations ?? "",
        });
        setPhotoUrl(u.photoUrl ?? null);
        setSeason(u.season ?? null);
      })
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof Data>(k: K, v: Data[K]) {
    setD((p) => (p ? { ...p, [k]: v } : p));
    setSaved(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!d || saving) return;
    setSaving(true);
    setError(null);
    const wc =
      d.wantsChildren === "yes"
        ? true
        : d.wantsChildren === "no"
          ? false
          : null;
    const json = (b: unknown) => ({
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    });
    try {
      const res = await Promise.all([
        fetch(
          "/api/me",
          json({
            displayName: d.displayName.trim(),
            cityApprox: d.cityApprox.trim() || null,
            country: d.country.trim() || null,
            photoBlurredByDefault: d.photoBlurredByDefault,
          }),
        ),
        fetch(
          "/api/me/faith-profile",
          json({
            denomination: d.denomination.trim() || null,
            ministry: d.ministry.trim() || null,
            engagementFrequency: d.engagementFrequency.trim() || null,
            localChurch: d.localChurch.trim() || null,
            testimony: d.testimony.trim() || null,
          }),
        ),
        fetch(
          "/api/me/relationship-profile",
          json({
            wantsChildren: wc,
            maritalStatus: d.maritalStatus || undefined,
            hasChildren: d.hasChildren === "yes",
            interests: d.interests.trim() || null,
            personality: d.personality.trim() || null,
            aspirations: d.aspirations.trim() || null,
            intentionStatement: d.intentionStatement.trim() || null,
            familyVision: d.familyVision.trim() || null,
          }),
        ),
      ]);
      if (res.every((r) => r.ok)) {
        setSaved(true);
        router.refresh();
        setTimeout(() => router.push("/profile"), 700);
      } else {
        setError(tc("error"));
      }
    } catch {
      setError(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  if (!d) {
    return (
      <main className="px-5 pt-8 text-center text-sm text-warmgray safe-top">
        {loadFailed ? (
          <div className="flex flex-col items-center gap-3">
            <p role="alert" className="text-danger">
              {tc("error")}
            </p>
            <button
              type="button"
              onClick={load}
              className="rounded-btnsm border border-sand-400 px-4 py-2 text-[13px] font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]"
            >
              {tc("retry")}
            </button>
          </div>
        ) : (
          tc("loading")
        )}
      </main>
    );
  }

  // Fiancés/mariés : espace couple, hors matching → on masque le statut
  // matrimonial (déjà déterminé par leur saison). Valeur conservée à l'envoi.
  const isCouple = season === "ENGAGED" || season === "MARRIED";

  // Ouvre la section « optionnelle » d'emblée si l'utilisateur a déjà rempli
  // l'un de ces champs (profil existant) ; repliée pour un profil neuf (court).
  const hasMore = Boolean(
    d.denomination ||
    d.ministry ||
    d.engagementFrequency ||
    d.localChurch ||
    d.testimony ||
    d.familyVision ||
    d.interests ||
    d.personality ||
    d.aspirations,
  );

  const input =
    "rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]";
  const lbl = "lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]";

  // Marqueur visuel obligatoire (*) / recommandé / optionnel — pour que la
  // longue liste ne PARAISSE plus tout entière obligatoire.
  const mark = (opts: { required?: boolean; recommended?: boolean }) =>
    opts.required ? (
      <span className="text-gold"> *</span>
    ) : opts.recommended ? (
      <span className="font-normal normal-case text-gold-deep dark:text-gold-light">
        {" "}
        · {t("recommended")}
      </span>
    ) : (
      <span className="font-normal normal-case opacity-60">
        {" "}
        · {t("optional")}
      </span>
    );

  const field = (
    key: keyof Data,
    label: string,
    opts: {
      area?: boolean;
      max?: number;
      min?: number;
      required?: boolean;
      recommended?: boolean;
    } = {},
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className={lbl}>
        {label}
        {mark(opts)}
      </span>
      {opts.area ? (
        <textarea
          name={key}
          data-testid={`field-${key}`}
          value={d[key] as string}
          onChange={(e) => set(key, e.target.value as Data[typeof key])}
          maxLength={opts.max}
          rows={4}
          className={`${input} resize-y leading-relaxed`}
        />
      ) : (
        <input
          name={key}
          data-testid={`field-${key}`}
          value={d[key] as string}
          onChange={(e) => set(key, e.target.value as Data[typeof key])}
          maxLength={opts.max}
          minLength={opts.min}
          required={opts.required}
          className={input}
        />
      )}
    </label>
  );

  // Menu déroulant : la valeur héritée (saisie libre) reste sélectionnable même
  // si absente de la liste curée. `labelFor` traduit l'affichage (la valeur
  // stockée reste canonique).
  const select = (
    key: keyof Data,
    label: string,
    options: readonly string[],
    opts: { required?: boolean; recommended?: boolean } = {},
    labelFor?: (v: string) => string,
  ) => {
    const val = d[key] as string;
    const all = !val || options.includes(val) ? options : [val, ...options];
    return (
      <label className="flex flex-col gap-1.5">
        <span className={lbl}>
          {label}
          {mark(opts)}
        </span>
        <select
          value={val}
          onChange={(e) => set(key, e.target.value as Data[typeof key])}
          className={input}
        >
          <option value="">{t("unspecified")}</option>
          {all.map((o) => (
            <option key={o} value={o}>
              {labelFor ? labelFor(o) : o}
            </option>
          ))}
        </select>
      </label>
    );
  };

  // Pays triés par libellé localisé (« Autre » épinglé en dernier).
  const countryOptions = [...COUNTRIES]
    .filter((c) => c !== "Autre")
    .sort((a, b) =>
      countryLabel(a, locale).localeCompare(countryLabel(b, locale), locale),
    )
    .concat("Autre");

  // Sélecteur à puces (multi) → stocké en CSV dans le champ texte existant.
  // `labels` traduit l'affichage ; la valeur stockée reste canonique (français).
  const chips = (
    key: "interests" | "personality",
    label: string,
    options: readonly string[],
    labels: Record<string, Record<Locale, string>>,
  ) => {
    const selected = csvToList(d[key]);
    const all = Array.from(new Set([...options, ...selected]));
    const toggle = (opt: string) => {
      const next = selected.includes(opt)
        ? selected.filter((x) => x !== opt)
        : [...selected, opt];
      set(key, next.join(", ") as Data[typeof key]);
    };
    return (
      <div className="flex flex-col gap-1.5">
        <span className={lbl}>
          {label}
          {mark({})}
        </span>
        <div className="flex flex-wrap gap-2">
          {all.map((opt) => {
            const on = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
                  on
                    ? "border-gold bg-gold/15 text-gold-ink dark:border-gold-light/50 dark:text-gold-light"
                    : "border-sand-400 text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
                }`}
              >
                {optionLabel(opt, labels, locale)}
                {on && <span aria-hidden> ✕</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="safe-top px-5 pb-28 pt-6 lg:mx-auto lg:max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-[26px] text-night dark:text-[#ECE7DD]">
          {t("editTitle")}
        </h1>
        <Link
          href="/profile"
          className="text-[13px] font-semibold text-warmgray dark:text-[#9A958B]"
        >
          {tc("cancel")}
        </Link>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* ---- Essentiel pour commencer ---- */}
        <section className="flex flex-col gap-3">
          <h2 className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
            {t("secEssential")}
          </h2>
          <p className="-mt-1 text-[12px] leading-snug text-sand-600 dark:text-[#9A958B]">
            {t("matchingHint")}
          </p>
          {photoEnabled && (
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 flex-none overflow-hidden rounded-full bg-sand-200 dark:bg-anthracite-700">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    🙂
                  </div>
                )}
              </div>
              <label className="cursor-pointer rounded-btnsm border border-sand-400 px-4 py-2 text-[13px] font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]">
                {photoBusy ? tc("loading") : t("photoChange")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={onPhotoChange}
                />
              </label>
            </div>
          )}
          {field("displayName", t("displayName"), {
            min: 2,
            max: 40,
            required: true,
          })}
          {field("cityApprox", t("cityLabel"), { max: 80, recommended: true })}
          {select("country", t("countryLabel"), countryOptions, {}, (v) =>
            countryLabel(v, locale),
          )}
          {!isCouple &&
            field("intentionStatement", t("intentionStatementLabel"), {
              area: true,
              max: 280,
              recommended: true,
            })}
          {!isCouple && (
            <label className="flex flex-col gap-1.5">
              <span className={lbl}>
                {t("maritalStatus")}
                {mark({ recommended: true })}
              </span>
              <select
                value={d.maritalStatus}
                onChange={(e) =>
                  set("maritalStatus", e.target.value as Data["maritalStatus"])
                }
                className={input}
              >
                <option value="">{t("unspecified")}</option>
                <option value="single">{t("single")}</option>
                <option value="widowed">{t("widowed")}</option>
                <option value="divorced">{t("divorced")}</option>
                <option value="single_parent">{t("singleParent")}</option>
                <option value="engaged">{t("engaged")}</option>
                <option value="married">{t("married")}</option>
              </select>
            </label>
          )}
        </section>

        {/* ---- Plus d'informations (optionnel, repliable) ---- */}
        <details
          open={hasMore}
          className="rounded-cardlg border border-sand-200 dark:border-anthracite-600"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
            <span className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
              {t("secMore")}
            </span>
            <span className="text-[11.5px] font-normal text-sand-500 dark:text-[#7E7A72]">
              {t("secMoreHint")}
            </span>
          </summary>

          <div className="flex flex-col gap-3 p-4 pt-1">
            {select(
              "denomination",
              t("denominationLabel"),
              DENOMINATIONS,
              {},
              (v) => optionLabel(v, DENOMINATION_LABELS, locale),
            )}
            {select(
              "engagementFrequency",
              t("engagementLabel"),
              ENGAGEMENT_FREQUENCIES,
              {},
              (v) => optionLabel(v, ENGAGEMENT_LABELS, locale),
            )}
            {field("ministry", t("ministry"), { max: 120 })}
            {field("localChurch", t("localChurch"), { max: 160 })}
            {field("testimony", t("testimonyLabel"), { area: true, max: 1500 })}
            {chips(
              "interests",
              t("interestsLabel"),
              INTERESTS,
              INTEREST_LABELS,
            )}
            {chips(
              "personality",
              t("personalityLabel"),
              PERSONALITY_TRAITS,
              PERSONALITY_LABELS,
            )}
            {field("familyVision", t("familyVision"), {
              area: true,
              max: 1000,
            })}
            {field("aspirations", t("aspirationsLabel"), {
              area: true,
              max: 500,
            })}
            <label className="flex flex-col gap-1.5">
              <span className={lbl}>
                {t("hasChildrenLabel")}
                {mark({})}
              </span>
              <select
                value={d.hasChildren}
                onChange={(e) =>
                  set("hasChildren", e.target.value as Data["hasChildren"])
                }
                className={input}
              >
                <option value="">{t("unspecified")}</option>
                <option value="yes">{tc("yes")}</option>
                <option value="no">{tc("no")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={lbl}>
                {t("wantsChildrenLabel")}
                {mark({})}
              </span>
              <select
                value={d.wantsChildren}
                onChange={(e) =>
                  set("wantsChildren", e.target.value as Data["wantsChildren"])
                }
                className={input}
              >
                <option value="">{t("unspecified")}</option>
                <option value="yes">{tc("yes")}</option>
                <option value="no">{tc("no")}</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-[13px] text-ink dark:text-[#ECE7DD]">
              <input
                type="checkbox"
                checked={d.photoBlurredByDefault}
                onChange={(e) => set("photoBlurredByDefault", e.target.checked)}
                className="h-4 w-4 accent-[#9A7B2E]"
              />
              {t("photoBlurLabel")}
            </label>
          </div>
        </details>

        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
        {saved && (
          <p
            role="status"
            className="text-[13px] text-[#2E7D5B] dark:text-[#7FC9A6]"
          >
            {t("saved")}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
        >
          {saving && <Spinner className="h-4 w-4" />}
          {saving ? t("saving") : t("save")}
        </button>
      </form>
    </main>
  );
}
