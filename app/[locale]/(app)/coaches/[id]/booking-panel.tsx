"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AsyncButton } from "@/components/AsyncButton";

export function BookingPanel({
  coachId,
  priceEUR,
}: {
  coachId: string;
  priceEUR: number;
}) {
  const t = useTranslations("coaches");
  const format = useFormatter();
  const [selected, setSelected] = useState<Date | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const slots = useMemo(() => {
    const out: Date[] = [];
    const base = new Date();
    for (const [days, hour] of [
      [1, 18],
      [2, 10],
      [5, 14],
    ] as const) {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      d.setHours(hour, days === 2 ? 30 : 0, 0, 0);
      out.push(d);
    }
    return out;
  }, []);

  async function book() {
    if (!selected) return;
    const res = await fetch(`/api/coaches/${coachId}/bookings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slotStart: selected.toISOString() }),
    });
    if (res.ok || res.status === 409) {
      setDone(
        t("booked", {
          date: format.dateTime(selected, {
            dateStyle: "full",
            timeStyle: "short",
          }),
        }),
      );
    }
  }

  return (
    <div className="pb-6">
      <h2 className="lbl mb-2.5 text-[10.5px] text-gold-deep dark:text-gold-light">
        {t("availability")}
      </h2>
      <div className="mb-5 flex gap-2.5">
        {slots.map((s) => {
          const active = selected?.getTime() === s.getTime();
          return (
            <button
              key={s.toISOString()}
              type="button"
              onClick={() => setSelected(s)}
              aria-pressed={active}
              className={`flex-1 rounded-btnsm px-1 py-2.5 text-center ${
                active
                  ? "bg-night text-[#F2EFE8] dark:bg-gold-light dark:text-anthracite-900"
                  : "border border-sand-200 bg-surface dark:border-anthracite-600 dark:bg-anthracite-800"
              }`}
            >
              <div
                className={`text-[12px] ${active ? "text-[#A6AEC0] dark:text-anthracite-800" : "text-sand-600 dark:text-[#7E7A72]"}`}
              >
                {format.dateTime(s, { weekday: "short" })}
              </div>
              <div
                className={`font-display text-lg ${active ? "" : "text-night dark:text-[#ECE7DD]"}`}
              >
                {s.getDate()}
              </div>
              <div
                className={`text-[11.5px] ${active ? "text-[#E8D9A8] dark:text-anthracite-800" : "text-gold-deep dark:text-gold-light"}`}
              >
                {format.dateTime(s, { hour: "2-digit", minute: "2-digit" })}
              </div>
            </button>
          );
        })}
      </div>
      {done ? (
        <p
          role="status"
          className="rounded-btn bg-[#EAF0EB] px-4 py-3 text-[14.5px] text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]"
        >
          {done}
        </p>
      ) : (
        <div className="flex items-center gap-3.5 rounded-cardlg border border-sand-200 bg-surface px-4 py-3.5 dark:border-anthracite-600 dark:bg-anthracite-800">
          <div>
            <div className="font-display text-2xl text-night dark:text-[#ECE7DD]">
              {priceEUR}&nbsp;€
            </div>
            <div className="text-[12px] text-sand-600 dark:text-[#7E7A72]">
              {t("perSession")}
            </div>
          </div>
          <AsyncButton
            onClick={book}
            disabled={!selected}
            className="flex flex-1 items-center justify-center gap-2 rounded-[13px] bg-navy py-3.5 text-[16px] font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <rect
                x="4"
                y="5"
                width="16"
                height="16"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M4 9h16M8 3v4M16 3v4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {t("book")}
          </AsyncButton>
        </div>
      )}
    </div>
  );
}
