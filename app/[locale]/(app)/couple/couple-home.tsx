"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";

type CoupleData = {
  space: {
    id: string;
    status: "PENDING" | "ACTIVE";
    season: "ENGAGED" | "MARRIED" | "PARENTS";
    origin: string;
    inviteCode: string | null;
    partner: string | null;
    iAmCreator: boolean;
    pendingMyConfirmation: boolean;
  } | null;
  season?: "JOURNEY" | "ENGAGED" | "MARRIED" | "PARENTS";
  eligibleMatch?: { id: string; other: string } | null;
  questions?: Array<{ id: string; text: string }>;
  programs?: Array<{ id: string; title: string; body: string }>;
};

export function CoupleHome() {
  const t = useTranslations("couple");
  const ta = useTranslations("agents");
  const tc = useTranslations("common");
  const router = useRouter();
  const [data, setData] = useState<CoupleData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<
    Record<string, { value: string; note: string }>
  >({});
  const [guidance, setGuidance] = useState<{
    danger: boolean;
    rituals: string[];
    word: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendState, setSendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  // Messagerie privée entre conjoints (espace actif uniquement).
  const [messages, setMessages] = useState<
    Array<{ id: string; mine: boolean; content: string }>
  >([]);
  const [draft, setDraft] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/couple")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  // Messagerie : charge l'historique quand l'espace couple est actif et lié.
  const spaceActive =
    data?.space?.status === "ACTIVE" && Boolean(data.space.partner);
  useEffect(() => {
    if (!spaceActive) return;
    fetch("/api/couple/messages")
      .then((r) => r.json())
      .then((j) => setMessages(j.messages ?? []))
      .catch(() => {});
  }, [spaceActive]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || msgBusy) return;
    setMsgBusy(true);
    try {
      const res = await fetch("/api/couple/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const m = (await res.json()) as { id: string };
        setMessages((prev) => [
          ...prev,
          { id: m.id, mine: true, content: text },
        ]);
        setDraft("");
      }
    } finally {
      setMsgBusy(false);
    }
  }

  async function createExternal() {
    const res = await fetch("/api/couple", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (res.ok) load();
  }
  async function createFromMatch(matchId: string) {
    const res = await fetch("/api/couple", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    if (res.ok) load();
  }
  async function join() {
    setError(null);
    const res = await fetch("/api/couple/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      load();
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(
        body?.error === "SEASON_MISMATCH"
          ? t("seasonMismatch")
          : t("codeInvalid"),
      );
    }
  }
  async function confirm() {
    const res = await fetch("/api/couple/confirm", { method: "POST" });
    if (res.ok) {
      load();
      router.refresh();
    }
  }
  async function setSeason(season: "MARRIED" | "PARENTS") {
    setError(null);
    const res = await fetch("/api/couple/season", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ season }),
    });
    if (res.ok) {
      setGuidance(null);
      setAnswers({});
      load();
    } else {
      setError(t("seasonError"));
    }
  }
  async function sendCheckin() {
    setBusy(true);
    setCheckinError(null);
    try {
      const res = await fetch("/api/agents/guardian/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: (data?.questions ?? []).map((q) => ({
            id: q.id,
            value: answers[q.id]?.value ?? "unsure",
            note: answers[q.id]?.note ?? "",
          })),
        }),
      });
      if (res.ok) {
        setGuidance(await res.json());
      } else {
        setCheckinError(
          res.status === 429 ? t("checkinRateLimited") : t("checkinError"),
        );
      }
    } catch {
      setCheckinError(t("checkinError"));
    } finally {
      setBusy(false);
    }
  }
  async function copyCode(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  async function sendInvite(e: FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email || sendState === "sending") return;
    setSendState("sending");
    const res = await fetch("/api/couple/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (res && res.ok) {
      setSendState("sent");
      setInviteEmail("");
    } else {
      setSendState("error");
    }
  }

  if (!data) {
    return (
      <main className="px-5 pt-8 text-center text-sm text-warmgray safe-top">
        {tc("loading")}
      </main>
    );
  }

  const engagedCtx =
    data.space?.season === "ENGAGED" ||
    (!data.space && data.season === "ENGAGED");

  const head = (
    <>
      <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
        {t(engagedCtx ? "titleEngaged" : "title")}
      </span>
      <h1 className="mb-4 mt-1 font-display text-[26px] leading-tight text-night dark:text-[#ECE7DD]">
        {t(engagedCtx ? "subtitleEngaged" : "subtitle")}
      </h1>
    </>
  );

  // --- Pas d'espace ---
  if (!data.space) {
    return (
      <main className="relative px-5 pt-6 pb-8 safe-top lg:mx-auto lg:max-w-3xl">
        <SacredMotif variant="tree" className="right-[-120px] top-[60px]" />
        {head}
        <p className="text-[15px] leading-relaxed text-warmgray dark:text-[#9A958B]">
          {t(engagedCtx ? "introEngaged" : "introNone")}
        </p>

        {!engagedCtx &&
          (data.eligibleMatch ? (
            <button
              type="button"
              onClick={() => createFromMatch(data.eligibleMatch!.id)}
              className="mt-5 w-full rounded-btnlg bg-gold py-4 text-base font-semibold text-night"
            >
              {t("marriedCta")} · {data.eligibleMatch.other}
            </button>
          ) : (
            <p className="mt-5 rounded-btn bg-sand-100 px-3.5 py-2.5 text-[12.5px] text-sand-600 dark:bg-anthracite-700 dark:text-[#7E7A72]">
              {t("marriedHint")}
            </p>
          ))}

        {data.season !== "JOURNEY" && (
          <button
            type="button"
            onClick={createExternal}
            className="mt-3 w-full rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t(engagedCtx ? "createEngaged" : "createExternal")}
          </button>
        )}

        <div className="mt-6 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
          <h2 className="text-sm font-semibold text-night dark:text-[#ECE7DD]">
            {t("joinTitle")}
          </h2>
          <div className="mt-2.5 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("codePlaceholder")}
              className="flex-1 rounded-btnsm border border-sand-300 bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <button
              type="button"
              onClick={join}
              disabled={code.length < 8}
              className="rounded-btnsm bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("join")}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[12.5px] text-danger">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const s = data.space;

  // --- En attente : je dois confirmer le mariage ---
  if (s.pendingMyConfirmation) {
    return (
      <main className="relative px-5 pt-6 safe-top lg:mx-auto lg:max-w-3xl">
        {head}
        <div className="rounded-cardlg border border-gold/40 bg-[#FBF6E9] p-5 dark:border-[#463A1F] dark:bg-[#272117]">
          <p className="font-display text-[18px] italic text-gold-ink dark:text-[#E0C77A]">
            {t("pendingConfirm", { name: s.partner ?? "?" })}
          </p>
          <button
            type="button"
            onClick={confirm}
            className="mt-4 w-full rounded-btnlg bg-gold py-4 text-base font-semibold text-night"
          >
            {t("confirmYes")}
          </button>
        </div>
      </main>
    );
  }

  // --- En attente du conjoint ---
  if (s.status === "PENDING" || !s.partner) {
    return (
      <main className="relative px-5 pt-6 safe-top lg:mx-auto lg:max-w-3xl">
        {head}
        {s.inviteCode ? (
          <div className="rounded-cardlg border border-sand-200 bg-surface p-5 text-center dark:border-anthracite-600 dark:bg-anthracite-800">
            <h2 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
              {t(engagedCtx ? "inviteTitleEngaged" : "inviteTitle")}
            </h2>
            <p className="mt-1.5 text-[13px] text-warmgray dark:text-[#9A958B]">
              {t(engagedCtx ? "inviteBodyEngaged" : "inviteBody")}
            </p>
            <p className="mx-auto mt-4 inline-block rounded-btn border border-gold bg-[#FBF6E9] px-5 py-3 font-mono text-lg tracking-widest text-gold-ink dark:border-[#6A5A2E] dark:bg-[#272117] dark:text-[#E0C77A]">
              {s.inviteCode}
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => copyCode(s.inviteCode!)}
                className="inline-flex items-center gap-1.5 rounded-btnsm border border-sand-300 px-4 py-2 text-[13px] font-semibold text-navy dark:border-anthracite-600 dark:text-gold-light"
              >
                {copied ? t("codeCopied") : t("copyCode")}
              </button>
            </div>

            <form
              onSubmit={sendInvite}
              className="mt-5 border-t border-sand-200 pt-4 text-left dark:border-anthracite-600"
            >
              <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
                {t("sendByEmail")}
              </span>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (sendState !== "idle") setSendState("idle");
                  }}
                  placeholder={t("partnerEmailPlaceholder")}
                  className="flex-1 rounded-btnsm border border-sand-300 bg-white px-3 py-2.5 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
                />
                <button
                  type="submit"
                  disabled={sendState === "sending" || !inviteEmail.trim()}
                  className="rounded-btnsm bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
                >
                  {sendState === "sending" ? t("sending") : t("sendInvite")}
                </button>
              </div>
              {sendState === "sent" && (
                <p
                  role="status"
                  className="mt-2 text-[12.5px] text-[#2E7D5B] dark:text-[#7FC9A6]"
                >
                  {t("inviteSent")}
                </p>
              )}
              {sendState === "error" && (
                <p role="alert" className="mt-2 text-[12.5px] text-danger">
                  {t("inviteError")}
                </p>
              )}
            </form>
          </div>
        ) : (
          <p className="rounded-btn bg-[#EAEDF2] px-3.5 py-3 text-[13.5px] text-[#2A3550] dark:bg-[#1A2233] dark:text-[#B9C6E0]">
            {t(engagedCtx ? "waitingPartnerEngaged" : "waitingPartner")}
          </p>
        )}
      </main>
    );
  }

  // --- Espace actif ---
  return (
    <main className="relative px-5 pt-6 pb-8 safe-top lg:mx-auto lg:max-w-3xl">
      <SacredMotif variant="flame" className="right-[-100px] top-[120px]" />
      <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
        {t(engagedCtx ? "titleEngaged" : "title")}
      </span>
      <h1 className="mt-1 font-display text-[26px] text-night dark:text-[#ECE7DD]">
        {t("with", { name: s.partner })}
      </h1>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-[8px] bg-navy px-2.5 py-1 text-[11px] font-semibold text-[#E8D9A8] dark:bg-[#222C42] dark:text-[#B9C6E0]">
          {t(`season${s.season}`)}
        </span>
        <span className="text-[11px] text-sand-600 dark:text-[#7E7A72]">
          {t("matchingOff")}
        </span>
      </div>

      {/* Messagerie privée entre conjoints */}
      <section className="mt-5 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
            {t("messagesTitle")}
          </h2>
          <span className="text-[10px] text-sand-500 dark:text-[#65625B]">
            {t("messagesPrivacy")}
          </span>
        </div>
        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-sand-500 dark:text-[#7E7A72]">
              {t("messagesEmpty")}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-[16px] px-3.5 py-2.5 text-sm leading-snug ${
                  m.mine
                    ? "self-end bg-navy text-[#EDEFF3] dark:bg-gold-light dark:text-anthracite-900"
                    : "self-start bg-sand-100 text-[#2A2823] dark:bg-anthracite-700 dark:text-[#CFCAC0]"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendMessage} className="mt-3 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("messagesPlaceholder")}
            aria-label={t("messagesPlaceholder")}
            className="flex-1 rounded-btnsm border border-sand-300 bg-white px-3 py-2.5 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
          />
          <button
            type="submit"
            disabled={msgBusy || !draft.trim()}
            className="rounded-btnsm bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("messagesSend")}
          </button>
        </form>
      </section>

      {/* Check-in du Gardien */}
      <section className="mt-5 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[18px] text-night dark:text-[#ECE7DD]">
            {t("checkinTitle")}
          </h2>
          <span className="text-[10px] text-sand-500 dark:text-[#65625B]">
            {t("checkinPrivacy")}
          </span>
        </div>
        {!guidance ? (
          <>
            <div className="mt-3 flex flex-col gap-3.5">
              {(data.questions ?? []).map((q) => (
                <div key={q.id}>
                  <p className="font-display text-[14.5px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
                    {q.text}
                  </p>
                  <div
                    className="mt-1.5 flex gap-1.5"
                    role="radiogroup"
                    aria-label={q.text}
                  >
                    {(["yes", "no", "unsure"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={answers[q.id]?.value === v}
                        onClick={() =>
                          setAnswers((a) => ({
                            ...a,
                            [q.id]: { value: v, note: a[q.id]?.note ?? "" },
                          }))
                        }
                        className={`rounded-[9px] px-3.5 py-2 text-[12.5px] font-semibold ${
                          answers[q.id]?.value === v
                            ? "bg-navy text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
                            : "border border-sand-300 text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
                        }`}
                      >
                        {t(v)}
                      </button>
                    ))}
                  </div>
                  <input
                    value={answers[q.id]?.note ?? ""}
                    onChange={(e) =>
                      setAnswers((a) => ({
                        ...a,
                        [q.id]: {
                          value: a[q.id]?.value ?? "unsure",
                          note: e.target.value,
                        },
                      }))
                    }
                    placeholder={t("notePlaceholder")}
                    className="mt-1.5 w-full rounded-btnsm border border-sand-200 bg-white px-3 py-2 text-[12.5px] text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={sendCheckin}
              disabled={
                busy ||
                (data.questions ?? []).some((q) => !answers[q.id]?.value)
              }
              className="mt-4 w-full rounded-btnsm bg-navy py-3 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("send")}
            </button>
            {checkinError && (
              <p role="alert" className="mt-2 text-[12.5px] text-danger">
                {checkinError}
              </p>
            )}
          </>
        ) : guidance.danger ? (
          <div className="mt-3 rounded-card border border-[#D8B6B0] bg-[#FBEFED] p-4 dark:border-[#5A3A34] dark:bg-[#2A1D1A]">
            <p className="text-[13.5px] leading-relaxed text-[#7A372C] dark:text-[#E0A89C]">
              {guidance.word}
            </p>
            <Link
              href="/coaches"
              className="mt-3 block rounded-btnsm bg-danger py-3 text-center text-sm font-semibold text-white"
            >
              {ta("prep.growthCta")}
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            {guidance.word && (
              <div className="rounded-card bg-night p-4 dark:border dark:border-[#283655] dark:bg-[#1B2740]">
                <span className="lbl text-[9px] text-gold dark:text-gold-light">
                  {t("guardianTitle")}
                </span>
                <p className="mt-1.5 font-display text-[14.5px] italic leading-relaxed text-[#D7DCE6]">
                  {guidance.word}
                </p>
              </div>
            )}
            {guidance.rituals.length > 0 && (
              <>
                <h3 className="lbl mb-2 mt-3.5 text-[9px] text-gold-deep dark:text-gold-light">
                  {t("ritualsTitle")}
                </h3>
                <div className="flex flex-col gap-2">
                  {guidance.rituals.map((r, i) => (
                    <p
                      key={i}
                      className="rounded-btn border border-gold/40 bg-[#FBF6E9] px-3.5 py-3 text-[13px] leading-normal text-[#6F5C2E] dark:border-[#463A1F] dark:bg-[#272117] dark:text-[#C2B488]"
                    >
                      {r}
                    </p>
                  ))}
                </div>
              </>
            )}
            {!guidance.word && guidance.rituals.length === 0 && (
              <div className="rounded-card border border-sand-200 bg-surface p-4 text-[13px] leading-normal text-sand-700 dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#B6B1A7]">
                {t("checkinDone")}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setGuidance(null);
                setAnswers({});
                setCheckinError(null);
              }}
              className="mt-3 w-full rounded-btnsm border border-sand-400 py-2.5 text-[13px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("checkinAgain")}
            </button>
          </div>
        )}
      </section>

      {/* Bascule saison */}
      {s.season === "ENGAGED" ? (
        <button
          type="button"
          onClick={() => setSeason("MARRIED")}
          className="mt-3.5 w-full rounded-btnsm border border-gold/50 bg-[#FBF6E9] py-3 text-[13px] font-semibold text-gold-ink dark:border-gold-light/40 dark:bg-[#272117] dark:text-gold-light"
        >
          {t("marriedCta")}
        </button>
      ) : s.season === "MARRIED" ? (
        <button
          type="button"
          onClick={() => setSeason("PARENTS")}
          className="mt-3.5 w-full rounded-btnsm border border-sand-400 py-3 text-[13px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
        >
          {t("childArrived")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setSeason("MARRIED")}
          className="mt-3.5 w-full rounded-btnsm border border-sand-400 py-3 text-[13px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
        >
          {t("backToMarried")}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-danger">
          {error}
        </p>
      )}

      {/* Parcours de saison */}
      <h2 className="lbl mb-2.5 mt-6 text-[9.5px] text-gold-deep dark:text-gold-light">
        {t("programsTitle")}
      </h2>
      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:items-stretch">
        {(data.programs ?? []).map((p) => (
          <article
            key={p.id}
            className="rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
          >
            <h3 className="font-display text-[17px] text-night dark:text-[#ECE7DD]">
              {p.title}
            </h3>
            <p className="mt-1 text-[13px] leading-normal text-warmgray dark:text-[#9A958B]">
              {p.body}
            </p>
          </article>
        ))}
      </div>

      {/* Espace confidence */}
      <section className="mt-6 rounded-cardlg bg-night p-5 dark:border dark:border-[#283655] dark:bg-[#1B2740]">
        <h2 className="font-display text-[19px] text-[#F4F1EA]">
          {t("confideTitle")}
        </h2>
        <p className="mt-1.5 text-[13px] leading-normal text-[#B9C0CE]">
          {t("confideBody")}
        </p>
        <div className="mt-3.5 flex gap-2.5">
          <Link
            href="/coach-ai"
            className="flex-1 rounded-btnsm bg-gold py-3 text-center text-[13px] font-semibold text-night"
          >
            {t("confideAi")}
          </Link>
          <Link
            href="/coaches"
            className="flex-1 rounded-btnsm border border-[#2E3A57] py-3 text-center text-[13px] font-medium text-[#D7DCE6]"
          >
            {t("confideHuman")}
          </Link>
        </div>
      </section>
    </main>
  );
}
