"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

type Data = {
  displayName: string;
  cityApprox: string;
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

export function EditProfileForm({ photoEnabled }: { photoEnabled: boolean }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

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

  const input =
    "rounded-btnsm border border-sand-400 bg-white px-3.5 py-3 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]";
  const lbl = "lbl text-[9.5px] text-sand-600 dark:text-[#9A958B]";
  const field = (
    key: keyof Data,
    label: string,
    opts: {
      area?: boolean;
      max?: number;
      min?: number;
      required?: boolean;
    } = {},
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className={lbl}>{label}</span>
      {opts.area ? (
        <textarea
          value={d[key] as string}
          onChange={(e) => set(key, e.target.value as Data[typeof key])}
          maxLength={opts.max}
          rows={4}
          className={`${input} resize-y leading-relaxed`}
        />
      ) : (
        <input
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
        <section className="flex flex-col gap-3">
          <h2 className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
            {t("secIdentity")}
          </h2>
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
          {field("cityApprox", t("cityLabel"), { max: 80 })}
          <label className="flex items-center gap-3 text-[13px] text-ink dark:text-[#ECE7DD]">
            <input
              type="checkbox"
              checked={d.photoBlurredByDefault}
              onChange={(e) => set("photoBlurredByDefault", e.target.checked)}
              className="h-4 w-4 accent-[#9A7B2E]"
            />
            {t("photoBlurLabel")}
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
            {t("spiritualIdentity")}
          </h2>
          {field("denomination", t("denominationLabel"), { max: 80 })}
          {field("ministry", t("ministry"), { max: 120 })}
          {field("engagementFrequency", t("engagementLabel"), { max: 60 })}
          {field("localChurch", t("localChurch"), { max: 160 })}
          {field("testimony", t("testimonyLabel"), { area: true, max: 4000 })}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="lbl text-[9.5px] text-gold-deep dark:text-gold-light">
            {t("secRelation")}
          </h2>
          <label className="flex flex-col gap-1.5">
            <span className={lbl}>{t("maritalStatus")}</span>
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
          <label className="flex flex-col gap-1.5">
            <span className={lbl}>{t("hasChildrenLabel")}</span>
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
          {field("intentionStatement", t("intentionStatementLabel"), {
            area: true,
            max: 280,
          })}
          {field("familyVision", t("familyVision"), { area: true, max: 2000 })}
          {field("interests", t("interestsLabel"), { area: true, max: 500 })}
          {field("personality", t("personalityLabel"), {
            area: true,
            max: 500,
          })}
          {field("aspirations", t("aspirationsLabel"), {
            area: true,
            max: 500,
          })}
          <label className="flex flex-col gap-1.5">
            <span className={lbl}>{t("wantsChildrenLabel")}</span>
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
        </section>

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
          className="rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </form>
    </main>
  );
}
