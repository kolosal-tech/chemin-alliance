"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";
import { useToast } from "@/components/Toast";

type Blocked = { id: string; displayName: string };

function isBlocked(value: unknown): value is Blocked {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Blocked>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.displayName === "string"
  );
}

/**
 * Gestion des personnes bloquées - confidentialité GRATUITE à vie.
 * Liste + déblocage. Affiché dans les réglages de confidentialité.
 */
export function BlockedUsers() {
  const t = useTranslations("block");
  const tc = useTranslations("common");
  const toast = useToast();
  const [list, setList] = useState<Blocked[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    setList(null);
    try {
      const response = await fetch("/api/blocks");
      if (!response.ok) throw new Error("blocks_load_failed");
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isBlocked)) {
        throw new Error("blocks_invalid_response");
      }
      setList(data);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(id: string) {
    try {
      const response = await fetch("/api/blocks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: id }),
      });
      if (!response.ok) throw new Error("unblock_failed");
      setList((current) => (current ?? []).filter((item) => item.id !== id));
      toast.success(t("unblocked"));
    } catch {
      toast.error(t("unblockError"));
    }
  }

  return (
    <section className="mt-6">
      <h2 className="lbl mb-2 text-[12px] text-gold-deep dark:text-gold-light">
        {t("manageTitle")}
      </h2>
      <div className="rounded-cardlg border border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800">
        {list === null && !loadError && (
          <p role="status" className="px-4 py-4 text-[16px] text-warmgray">
            {tc("loading")}
          </p>
        )}
        {loadError && (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 px-4 py-4"
          >
            <p className="text-[16px] text-danger">{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-btnsm border border-sand-400 px-3 py-2 text-[15px] font-semibold text-night dark:border-anthracite-600 dark:text-[#ECE7DD]"
            >
              {tc("retry")}
            </button>
          </div>
        )}
        {list && list.length === 0 && (
          <p className="px-4 py-4 text-[16px] text-warmgray dark:text-[#9A958B]">
            {t("empty")}
          </p>
        )}
        {(list ?? []).map((b, i) => (
          <div
            key={b.id}
            className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-sand-100 dark:border-anthracite-700" : ""}`}
          >
            <span className="text-sm text-ink dark:text-[#ECE7DD]">
              {b.displayName}
            </span>
            <AsyncButton
              onClick={() => unblock(b.id)}
              className="rounded-btnsm border border-sand-400 px-3 py-1.5 text-[15px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("unblock")}
            </AsyncButton>
          </div>
        ))}
      </div>
    </section>
  );
}
