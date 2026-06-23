"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AsyncButton } from "@/components/AsyncButton";

type Status = "PENDING" | "BLESSED" | "CAUTION" | null;

export function BlessingRequest({
  matchId,
  initialStatus,
  note,
}: {
  matchId: string;
  initialStatus: Status;
  note: string | null;
}) {
  const t = useTranslations("sponsor");
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [noSponsor, setNoSponsor] = useState(false);
  const [err, setErr] = useState(false);

  async function ask() {
    setBusy(true);
    setErr(false);
    setNoSponsor(false);
    const r = await fetch(`/api/matches/${matchId}/blessing`, {
      method: "POST",
    });
    setBusy(false);
    if (r.ok) setStatus("PENDING");
    else if (r.status === 409) setNoSponsor(true);
    else setErr(true);
  }

  // Statut résolu : carte verte (bénie) / ambre (prudence) / neutre (en attente).
  if (status === "BLESSED" || status === "CAUTION") {
    const blessed = status === "BLESSED";
    return (
      <div
        role="status"
        className={`mt-4 rounded-card border px-3 py-3 text-[16px] leading-relaxed ${
          blessed
            ? "border-[#CFE0D4] bg-[#EAF0EB] text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]"
            : "border-[#EAD9A8] bg-[#FBF6E9] text-[#6F5C2E] dark:border-[#463A1F] dark:bg-[#272117] dark:text-[#C2B488]"
        }`}
      >
        <p className="font-semibold">
          {blessed ? t("statusBlessed") : t("statusCaution")}
        </p>
        {note && (
          <p className="mt-1.5">
            <span className="lbl text-[11px] opacity-70">{t("noteLabel")}</span>{" "}
            <span className="italic">« {note} »</span>
          </p>
        )}
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <p
        role="status"
        className="mt-4 rounded-card border border-sand-200 bg-surface px-3 py-3 text-[16px] text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]"
      >
        {t("statusPending")}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <AsyncButton
        onClick={ask}
        disabled={busy}
        className="w-full rounded-btnlg border border-gold bg-gold/10 px-3 py-3.5 text-[17px] font-semibold text-gold-ink disabled:opacity-60 dark:border-[#6A5A2E] dark:bg-[#272117] dark:text-[#E0C77A]"
      >
        {t("askBlessing")}
      </AsyncButton>
      {noSponsor && (
        <p className="mt-2 text-[15px] text-warmgray dark:text-[#9A958B]">
          {t("noSponsor")}{" "}
          <Link
            href="/settings/sponsor"
            className="font-semibold text-gold-deep dark:text-gold-light"
          >
            {t("linkTitle")}
          </Link>
        </p>
      )}
      {err && (
        <p className="mt-2 text-[15px] text-[#9A2E2E] dark:text-[#E0A0A0]">
          {t("error")}
        </p>
      )}
    </div>
  );
}
