"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AsyncButton } from "@/components/AsyncButton";

export function ReportActions({ reportId }: { reportId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);

  async function update(action: "RESOLVED" | "DISMISSED" | "BAN") {
    setBusy(true);
    await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setConfirmBan(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <AsyncButton
          disabled={busy}
          onClick={() => update("RESOLVED")}
          className="flex-1 rounded-btnsm bg-navy py-2.5 text-xs font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
        >
          {t("resolve")}
        </AsyncButton>
        <AsyncButton
          disabled={busy}
          onClick={() => update("DISMISSED")}
          className="flex-1 rounded-btnsm border border-sand-400 py-2.5 text-xs font-medium text-warmgray disabled:opacity-50 dark:border-anthracite-600 dark:text-[#9A958B]"
        >
          {t("dismiss")}
        </AsyncButton>
        <AsyncButton
          disabled={busy}
          onClick={() => setConfirmBan(true)}
          className="rounded-btnsm border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs font-semibold text-danger disabled:opacity-50"
        >
          {t("ban")}
        </AsyncButton>
      </div>
      {confirmBan && (
        <div className="rounded-[10px] border border-danger/30 bg-danger/[0.08] p-3">
          <p className="mb-1 text-[13px] font-semibold text-danger">
            {t("banConfirmTitle")}
          </p>
          <p className="mb-3 text-[12px] text-warmgray dark:text-[#9A958B]">
            {t("banConfirmBody")}
          </p>
          <div className="flex gap-2">
            <AsyncButton
              disabled={busy}
              onClick={() => update("BAN")}
              className="rounded-btnsm bg-danger px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("banDone")}
            </AsyncButton>
            <button
              type="button"
              onClick={() => setConfirmBan(false)}
              className="rounded-btnsm border border-sand-400 px-4 py-2 text-xs text-warmgray dark:border-anthracite-600"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
