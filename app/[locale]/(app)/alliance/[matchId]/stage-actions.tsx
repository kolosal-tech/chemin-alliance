"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AllianceStage, ContactExchangeStatus } from "@prisma/client";

type Question = { id: string; text: string; answered: boolean };

export function StageActions({
  matchId,
  questions,
  contactExchange,
  stage,
  otherName,
}: {
  matchId: string;
  questions: Question[];
  contactExchange: ContactExchangeStatus;
  stage: AllianceStage;
  otherName: string;
}) {
  const t = useTranslations("alliance");
  const tc = useTranslations("common");
  const ta = useTranslations("agents");
  const tcp = useTranslations("couple");
  const router = useRouter();
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [answered, setAnswered] = useState<Set<string>>(
    new Set(questions.filter((q) => q.answered).map((q) => q.id)),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitText, setExitText] = useState("");
  const [exitReason, setExitReason] = useState("no_alignment");
  const [draftBusy, setDraftBusy] = useState(false);
  const [ce, setCe] = useState(contactExchange);

  async function saveAnswer(qid: string) {
    const res = await fetch(`/api/matches/${matchId}/alliance-path/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: qid, answer }),
    });
    if (res.ok) {
      setAnswered((s) => new Set([...s, qid]));
      setOpenQ(null);
      setAnswer("");
      setNotice(t("answerSaved"));
    }
  }

  async function requestAdvance() {
    const res = await fetch(
      `/api/matches/${matchId}/alliance-path/request-advance`,
      { method: "POST" },
    );
    const data = await res.json();
    if (data.advanced) {
      setNotice(t("advanceDone", { stage: data.stage }));
      router.refresh();
    } else if (data.userMessage) {
      setNotice(data.userMessage);
    } else {
      setNotice(t("advanceRequested"));
    }
  }

  async function requestContact() {
    const res = await fetch(`/api/matches/${matchId}/contact-exchange`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.allowed) {
      setCe("REQUESTED");
      setNotice(t("contactRequested", { name: otherName }));
    } else {
      setNotice(data.userMessage);
    }
  }

  async function closeElegantly() {
    if (!exitText.trim()) return;
    const res = await fetch(`/api/matches/${matchId}/close`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: exitText }),
    });
    if (res.ok) {
      setExitOpen(false);
      setNotice(t("exitDone"));
      router.push("/messages");
      router.refresh();
    }
  }

  const templates = [1, 2, 3, 4].map((i) => t(`exitTemplate${i}`));

  async function aiDraft() {
    setDraftBusy(true);
    const res = await fetch("/api/agents/exit-helper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId, reason: exitReason, note: exitText.slice(0, 500) }),
    });
    setDraftBusy(false);
    if (res.ok) {
      const d = await res.json();
      if (d.draft) setExitText(d.draft);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <div key={q.id}>
            <button
              type="button"
              onClick={() => setOpenQ(openQ === q.id ? null : q.id)}
              className="flex w-full items-center gap-2.5 rounded-btn border border-sand-200 bg-surface px-3.5 py-3 text-left dark:border-anthracite-600 dark:bg-anthracite-800"
            >
              <span className="flex-1 font-display text-[13.5px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
                {q.text}
              </span>
              {answered.has(q.id) ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="#3F6B50" strokeWidth="1.6" />
                  <path d="M8.5 12.5l2.2 2.2 4.8-5" stroke="#3F6B50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>
            {openQ === q.id && (
              <div className="mt-1.5 rounded-btn border border-sand-200 bg-white p-3 dark:border-anthracite-600 dark:bg-anthracite-700">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={3}
                  placeholder={t("answerPlaceholder")}
                  className="w-full resize-none bg-transparent text-sm text-ink outline-none dark:text-[#ECE7DD]"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpenQ(null)} className="px-3 py-2 text-xs font-medium text-warmgray dark:text-[#9A958B]">
                    {tc("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveAnswer(q.id)}
                    disabled={!answer.trim()}
                    className="rounded-btnsm bg-navy px-4 py-2 text-xs font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
                  >
                    {tc("save")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {notice && (
        <p role="status" className="mt-3 rounded-btn border border-[#D4DAE4] bg-[#EAEDF2] px-3.5 py-2.5 text-[13px] text-[#2A3550] dark:border-[#2A3A56] dark:bg-[#1A2233] dark:text-[#B9C6E0]">
          {notice}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {stage === "DISCERNMENT" && ce === "NOT_ALLOWED" && (
          <button
            type="button"
            onClick={requestContact}
            className="rounded-btnsm border border-gold bg-surface py-3 text-sm font-semibold text-gold-ink dark:border-gold-light/60 dark:bg-anthracite-800 dark:text-gold-light"
          >
            {t("contactRequest")}
          </button>
        )}
        {ce === "ACCEPTED" && (
          <p className="rounded-btn bg-[#EAF0EB] px-3.5 py-2.5 text-[13px] text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
            {t("contactAccepted")}
          </p>
        )}
        {(stage === "COMMITMENT" || stage === "MARRIAGE_PREPARATION") && (
          <button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/couple", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ matchId }),
              });
              if (res.ok || res.status === 409) router.push("/couple");
            }}
            className="rounded-btnsm bg-gold py-3 text-sm font-semibold text-night"
          >
            {tcp("marriedCta")}
          </button>
        )}
        <button
          type="button"
          onClick={requestAdvance}
          className="rounded-btnsm bg-navy py-3 text-sm font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
        >
          {t("requestAdvance")}
        </button>
      </div>

      {/* Sortie élégante — discrète mais présente */}
      <div className="mt-5 flex justify-center border-t border-sand-200 pt-4 dark:border-anthracite-600">
        {!exitOpen ? (
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="flex items-center gap-1.5 text-[13px] text-sand-500 dark:text-[#7E7A72]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("exitElegant")}
          </button>
        ) : (
          <div className="w-full rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
            <h3 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">{t("exitTitle")}</h3>
            <p className="mt-1 text-[12.5px] text-warmgray dark:text-[#9A958B]">{t("exitBody")}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setExitText(tpl)}
                  className={`rounded-btn border px-3 py-2.5 text-left text-[12.5px] leading-snug ${
                    exitText === tpl
                      ? "border-gold bg-[#FBF6E9] text-[#6F5C2E] dark:border-gold-light/60 dark:bg-[#272117] dark:text-[#C2B488]"
                      : "border-sand-200 text-[#3A372F] dark:border-anthracite-600 dark:text-[#CFCAC0]"
                  }`}
                >
                  {tpl}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                aria-label={ta("exit.reasonLabel")}
                className="flex-1 rounded-btnsm border border-sand-300 bg-white px-2.5 py-2.5 text-[12.5px] text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
              >
                <option value="no_alignment">{ta("exit.reasonNoAlignment")}</option>
                <option value="different_visions">{ta("exit.reasonVisions")}</option>
                <option value="need_pause">{ta("exit.reasonPause")}</option>
                <option value="other">{ta("exit.reasonOther")}</option>
              </select>
              <button
                type="button"
                onClick={aiDraft}
                disabled={draftBusy}
                className="rounded-btnsm border border-gold px-3 py-2.5 text-[12.5px] font-semibold text-gold-ink disabled:opacity-60 dark:border-gold-light/60 dark:text-gold-light"
              >
                {ta("exit.generate")}
              </button>
            </div>
            <textarea
              value={exitText}
              onChange={(e) => setExitText(e.target.value)}
              rows={3}
              className="mt-2.5 w-full resize-none rounded-btn border border-sand-200 bg-white p-3 text-sm text-ink outline-none dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setExitOpen(false)} className="px-3 py-2 text-xs font-medium text-warmgray dark:text-[#9A958B]">
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={closeElegantly}
                disabled={!exitText.trim()}
                className="rounded-btnsm border border-[#D8B6B0] px-4 py-2 text-xs font-semibold text-danger disabled:opacity-50 dark:border-[#5A3A34]"
              >
                {t("exitConfirm")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
