"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";

type Blocked = { id: string; displayName: string };

/**
 * Gestion des personnes bloquées — confidentialité GRATUITE à vie.
 * Liste + déblocage. Affiché dans les réglages de confidentialité.
 */
export function BlockedUsers() {
  const t = useTranslations("block");
  const [list, setList] = useState<Blocked[] | null>(null);

  useEffect(() => {
    fetch("/api/blocks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]));
  }, []);

  async function unblock(id: string) {
    setList((l) => (l ?? []).filter((b) => b.id !== id));
    await fetch("/api/blocks", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId: id }),
    });
  }

  return (
    <section className="mt-6">
      <h2 className="lbl mb-2 text-[9.5px] text-gold-deep dark:text-gold-light">
        {t("manageTitle")}
      </h2>
      <div className="rounded-cardlg border border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800">
        {list && list.length === 0 && (
          <p className="px-4 py-4 text-[13px] text-warmgray dark:text-[#9A958B]">
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
              className="rounded-btnsm border border-sand-400 px-3 py-1.5 text-[12px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("unblock")}
            </AsyncButton>
          </div>
        ))}
      </div>
    </section>
  );
}
