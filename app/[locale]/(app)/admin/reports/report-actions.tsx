"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AsyncButton } from "@/components/AsyncButton";

export function ReportActions({ reportId }: { reportId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(status: "RESOLVED" | "DISMISSED") {
    setBusy(true);
    await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
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
    </div>
  );
}
