"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { AsyncButton } from "@/components/AsyncButton";
import { Spinner } from "@/components/Spinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

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
  questions?: Array<{ id: string; text: string; kind?: "scale" | "open" }>;
  programs?: Array<{ id: string; title: string; body: string }>;
};

export function CoupleHome() {
  const t = useTranslations("couple");
  const ta = useTranslations("agents");
  const tc = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const locale = useLocale();
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
    Array<{ id: string; mine: boolean; content: string; createdAt?: string }>
  >([]);
  const [draft, setDraft] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  // Fil de messages : on garde la vue calée sur le DERNIER message. Sans cela,
  // le scroll reste en haut et la première bulle apparaît « coupée ».
  const feedRef = useRef<HTMLDivElement>(null);
  // Événement de vie à confirmer (changement de saison du couple).
  const [seasonConfirm, setSeasonConfirm] = useState<
    "MARRIED" | "PARENTS" | null
  >(null);

  // Renvoie la promesse : les appelants (ex. bascule de saison) attendent que
  // l'état réel soit rechargé AVANT d'annoncer un succès (pas de toast en avance
  // de phase sur l'état interne).
  const load = useCallback(() => {
    return fetch("/api/couple")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  // Horodatage minimal HH:MM, dans la locale de l'utilisateur.
  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

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

  // Cale la vue sur le dernier message à chaque mise à jour du fil.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Garde-fou : on n'affiche jamais une bulle au contenu vide (sinon une bulle
  // « fantôme » illisible apparaît, cf. bug de la bulle beige vide).
  const visibleMessages = messages.filter((m) => m.content.trim().length > 0);

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
        const m = (await res.json()) as { id: string; createdAt?: string };
        setMessages((prev) => [
          ...prev,
          { id: m.id, mine: true, content: text, createdAt: m.createdAt },
        ]);
        setDraft("");
      } else {
        toast.error(t("messageError"));
      }
    } catch {
      toast.error(t("messageError"));
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
    try {
      const res = await fetch("/api/couple/season", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ season }),
      });
      if (res.ok) {
        setGuidance(null);
        setAnswers({});
        // Attendre le rechargement : le toast ne doit annoncer la nouvelle
        // saison qu'une fois l'état interne (parcours, check-in) réellement à jour.
        await load();
        toast.success(
          season === "PARENTS" ? t("childArrivedDone") : t("marriedDone"),
        );
      } else {
        toast.error(t("seasonError"));
      }
    } catch {
      toast.error(t("seasonError"));
    }
  }
  async function sendCheckin() {
    setBusy(true);
    setCheckinError(null);
    // Garde-fou : si le Gardien (LLM) ne répond pas, on coupe à 25 s (> le
    // timeout serveur de 20 s) plutôt que de laisser tourner « réfléchit… »
    // indéfiniment. L'utilisateur a alors un message clair et peut réessayer.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
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
        signal: controller.signal,
      });
      if (res.ok) {
        setGuidance(await res.json());
        toast.success(t("checkinSent"));
      } else {
        const msg =
          res.status === 429 ? t("checkinRateLimited") : t("checkinError");
        setCheckinError(msg);
        toast.error(msg);
      }
    } catch (e) {
      // AbortError = délai dépassé. Les réponses saisies restent intactes
      // (pas de reset) pour permettre un nouvel envoi immédiat.
      const timedOut = e instanceof DOMException && e.name === "AbortError";
      const msg = timedOut ? t("checkinTimeout") : t("checkinError");
      setCheckinError(msg);
      toast.error(msg);
    } finally {
      clearTimeout(timer);
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
      <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
        {t(engagedCtx ? "titleEngaged" : "title")}
      </span>
      <h1 className="mb-4 mt-1 font-display text-[29px] leading-tight text-night dark:text-[#ECE7DD]">
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
        <p className="text-[18px] leading-relaxed text-warmgray dark:text-[#9A958B]">
          {t(engagedCtx ? "introEngaged" : "introNone")}
        </p>

        {!engagedCtx &&
          (data.eligibleMatch ? (
            <AsyncButton
              onClick={() => createFromMatch(data.eligibleMatch!.id)}
              className="mt-5 w-full rounded-btnlg bg-gold py-4 text-base font-semibold text-night"
            >
              {t("marriedCta")} · {data.eligibleMatch.other}
            </AsyncButton>
          ) : (
            <p className="mt-5 rounded-btn bg-sand-100 px-3.5 py-2.5 text-[15px] text-sand-600 dark:bg-anthracite-700 dark:text-[#7E7A72]">
              {t("marriedHint")}
            </p>
          ))}

        {data.season !== "JOURNEY" && (
          <AsyncButton
            onClick={createExternal}
            className="mt-3 w-full rounded-btnlg bg-navy py-4 text-base font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t(engagedCtx ? "createEngaged" : "createExternal")}
          </AsyncButton>
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
              className="flex-1 rounded-btnsm border border-sand-300 bg-surface px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
            />
            <AsyncButton
              onClick={join}
              disabled={code.length < 8}
              className="rounded-btnsm bg-navy px-4 py-2.5 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("join")}
            </AsyncButton>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[15px] text-danger">
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
          <p className="font-display text-[21px] italic text-gold-ink dark:text-[#E0C77A]">
            {t("pendingConfirm", { name: s.partner ?? "?" })}
          </p>
          <AsyncButton
            onClick={confirm}
            className="mt-4 w-full rounded-btnlg bg-gold py-4 text-base font-semibold text-night"
          >
            {t("confirmYes")}
          </AsyncButton>
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
            <h2 className="font-display text-[21px] text-night dark:text-[#ECE7DD]">
              {t(engagedCtx ? "inviteTitleEngaged" : "inviteTitle")}
            </h2>
            <p className="mt-1.5 text-[16px] text-warmgray dark:text-[#9A958B]">
              {t(engagedCtx ? "inviteBodyEngaged" : "inviteBody")}
            </p>
            <p className="mx-auto mt-4 inline-block rounded-btn border border-gold bg-[#FBF6E9] px-5 py-3 font-mono text-lg tracking-widest text-gold-ink dark:border-[#6A5A2E] dark:bg-[#272117] dark:text-[#E0C77A]">
              {s.inviteCode}
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => copyCode(s.inviteCode!)}
                className="inline-flex items-center gap-1.5 rounded-btnsm border border-sand-300 px-4 py-2 text-[16px] font-semibold text-navy dark:border-anthracite-600 dark:text-gold-light"
              >
                {copied ? t("codeCopied") : t("copyCode")}
              </button>
            </div>

            <form
              onSubmit={sendInvite}
              className="mt-5 border-t border-sand-200 pt-4 text-left dark:border-anthracite-600"
            >
              <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
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
                  className="flex-1 rounded-btnsm border border-sand-300 bg-surface px-3 py-2.5 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
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
                  className="mt-2 text-[15px] text-[#2E7D5B] dark:text-[#7FC9A6]"
                >
                  {t("inviteSent")}
                </p>
              )}
              {sendState === "error" && (
                <p role="alert" className="mt-2 text-[15px] text-danger">
                  {t("inviteError")}
                </p>
              )}
            </form>
          </div>
        ) : (
          <p className="rounded-btn bg-[#EAEDF2] px-3.5 py-3 text-[16px] text-[#2A3550] dark:bg-[#1A2233] dark:text-[#B9C6E0]">
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
      <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
        {t(engagedCtx ? "titleEngaged" : "title")}
      </span>
      <h1 className="mt-1 font-display text-[29px] text-night dark:text-[#ECE7DD]">
        {t("with", { name: s.partner })}
      </h1>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-[8px] bg-navy px-2.5 py-1 text-[13px] font-semibold text-[#E8D9A8] dark:bg-[#222C42] dark:text-[#B9C6E0]">
          {t(`season${s.season}`)}
        </span>
        <span className="text-[13px] text-sand-600 dark:text-[#7E7A72]">
          {t("matchingOff")}
        </span>
      </div>

      {/* Messagerie privée entre conjoints */}
      <section className="mt-5 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[21px] text-night dark:text-[#ECE7DD]">
            {t("messagesTitle")}
          </h2>
          <span className="text-[12px] text-sand-500 dark:text-[#65625B]">
            {t("messagesPrivacy")}
          </span>
        </div>
        {/* Fil des messages : padding droit pour décoller les bulles du bord
            et de la barre de défilement ; mots longs coupés pour éviter tout
            débordement horizontal sur mobile. */}
        <div
          ref={feedRef}
          className="msg-scroll mt-3 flex max-h-72 flex-col gap-2.5 overflow-y-auto pl-0.5 pr-2"
        >
          {visibleMessages.length === 0 ? (
            <p className="py-4 text-center text-[16px] text-sand-500 dark:text-[#7E7A72]">
              {t("messagesEmpty")}
            </p>
          ) : (
            visibleMessages.map((m) => (
              <div
                key={m.id}
                className={`flex max-w-[82%] flex-col ${
                  m.mine ? "items-end self-end" : "items-start self-start"
                }`}
              >
                <div
                  className={`bubble whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[18px] px-3.5 py-2.5 text-sm leading-snug ${
                    m.mine
                      ? "bubble-self rounded-br-md"
                      : "bubble-peer rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
                {fmtTime(m.createdAt) && (
                  <span
                    className={`mt-1 px-1 text-[12px] text-sand-500 dark:text-[#65625B] ${
                      m.mine ? "text-right" : "text-left"
                    }`}
                  >
                    {fmtTime(m.createdAt)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        {/* Zone de saisie : l'input prend toute la largeur disponible (min-w-0
            pour autoriser le rétrécissement) et le bouton Envoyer est figé
            (shrink-0) afin de ne jamais chevaucher le texte ni les bulles.
            Bouton vert sauge, distinct des bulles dorées. */}
        <form onSubmit={sendMessage} className="mt-3 flex items-stretch gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("messagesPlaceholder")}
            aria-label={t("messagesPlaceholder")}
            className="min-w-0 flex-1 rounded-btnsm border border-sand-300 bg-surface px-3 py-2.5 text-sm text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
          />
          <button
            type="submit"
            disabled={msgBusy || !draft.trim()}
            aria-busy={msgBusy}
            className="btn-glass btn-glass-sage flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-btnsm px-4 py-2.5 text-sm"
          >
            {msgBusy && <Spinner className="h-4 w-4" />}
            {t("messagesSend")}
          </button>
        </form>
      </section>

      {/* Check-in du Gardien */}
      <section className="mt-5 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[21px] text-night dark:text-[#ECE7DD]">
            {t("checkinTitle")}
          </h2>
          <span className="text-[12px] text-sand-500 dark:text-[#65625B]">
            {t("checkinPrivacy")}
          </span>
        </div>
        {!guidance ? (
          <>
            <div className="mt-3 flex flex-col gap-3.5">
              {(data.questions ?? []).map((q) =>
                q.kind === "open" ? (
                  // Question ouverte : pas de Oui/Non (incohérent) - réponse
                  // libre OBLIGATOIRE, exigée par la validation du bouton d'envoi.
                  <div key={q.id}>
                    <p className="font-display text-[17px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
                      {q.text}
                    </p>
                    <textarea
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
                      required
                      rows={3}
                      placeholder={t("openAnswerPlaceholder")}
                      aria-label={q.text}
                      className="mt-1.5 w-full resize-y rounded-btnsm border border-sand-300 bg-surface px-3 py-2.5 text-[16px] leading-snug text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
                    />
                  </div>
                ) : (
                  <div key={q.id}>
                    <p className="font-display text-[17px] italic leading-snug text-[#3A372F] dark:text-[#CFCAC0]">
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
                          className={`btn-glass rounded-[9px] px-3.5 py-2 text-[15px] font-semibold ${
                            answers[q.id]?.value === v
                              ? "btn-glass-blue"
                              : "btn-glass-neutral"
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
                      className="mt-1.5 w-full rounded-btnsm border border-sand-200 bg-surface px-3 py-2 text-[15px] text-ink dark:border-anthracite-600 dark:bg-anthracite-700 dark:text-[#ECE7DD]"
                    />
                  </div>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={sendCheckin}
              disabled={
                busy ||
                (data.questions ?? []).some((q) =>
                  q.kind === "open"
                    ? !answers[q.id]?.note?.trim()
                    : !answers[q.id]?.value,
                )
              }
              aria-busy={busy}
              className="btn-glass btn-glass-blue mt-4 flex w-full items-center justify-center gap-2 rounded-btnsm py-3 text-sm font-semibold disabled:opacity-60"
            >
              {busy && <Spinner className="h-4 w-4" />}
              {busy ? t("checkinSending") : t("send")}
            </button>
            {checkinError && (
              <p role="alert" className="mt-2 text-[15px] text-danger">
                {checkinError}
              </p>
            )}
          </>
        ) : guidance.danger ? (
          <div className="mt-3 rounded-card border border-[#D8B6B0] bg-[#FBEFED] p-4 dark:border-[#5A3A34] dark:bg-[#2A1D1A]">
            <p className="text-[16px] leading-relaxed text-[#7A372C] dark:text-[#E0A89C]">
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
                <span className="lbl text-[11px] text-gold dark:text-gold-light">
                  {t("guardianTitle")}
                </span>
                <p className="mt-1.5 font-display text-[17px] italic leading-relaxed text-[#D7DCE6]">
                  {guidance.word}
                </p>
              </div>
            )}
            {guidance.rituals.length > 0 && (
              <>
                <h3 className="lbl mb-2 mt-3.5 text-[11px] text-gold-deep dark:text-gold-light">
                  {t("ritualsTitle")}
                </h3>
                <div className="flex flex-col gap-2">
                  {guidance.rituals.map((r, i) => (
                    <p
                      key={i}
                      className="rounded-btn border border-gold/40 bg-[#FBF6E9] px-3.5 py-3 text-[16px] leading-normal text-[#6F5C2E] dark:border-[#463A1F] dark:bg-[#272117] dark:text-[#C2B488]"
                    >
                      {r}
                    </p>
                  ))}
                </div>
              </>
            )}
            {!guidance.word && guidance.rituals.length === 0 && (
              <div className="rounded-card border border-sand-200 bg-surface p-4 text-[16px] leading-normal text-sand-700 dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#B6B1A7]">
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
              className="mt-3 w-full rounded-btnsm border border-sand-400 py-2.5 text-[16px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("checkinAgain")}
            </button>
          </div>
        )}
      </section>

      {/* Bascule saison - un changement de saison est un « événement de vie » :
          on confirme avant (modale), et la bascule retour reste réversible. */}
      {s.season === "ENGAGED" ? (
        <button
          type="button"
          onClick={() => setSeasonConfirm("MARRIED")}
          className="mt-3.5 w-full rounded-btnsm border border-gold/50 bg-[#FBF6E9] py-3 text-[16px] font-semibold text-gold-ink dark:border-gold-light/40 dark:bg-[#272117] dark:text-gold-light"
        >
          {t("marriedCta")}
        </button>
      ) : s.season === "MARRIED" ? (
        <button
          type="button"
          onClick={() => setSeasonConfirm("PARENTS")}
          className="mt-3.5 w-full rounded-btnsm border border-sand-400 py-3 text-[16px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
        >
          {t("childArrived")}
        </button>
      ) : (
        <AsyncButton
          onClick={() => setSeason("MARRIED")}
          className="mt-3.5 w-full rounded-btnsm border border-sand-400 py-3 text-[16px] font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
        >
          {t("backToMarried")}
        </AsyncButton>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[15px] text-danger">
          {error}
        </p>
      )}

      {/* Parcours de saison */}
      <h2 className="lbl mb-2.5 mt-6 text-[12px] text-gold-deep dark:text-gold-light">
        {t("programsTitle")}
      </h2>
      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:items-stretch">
        {(data.programs ?? []).map((p) => (
          <article
            key={p.id}
            className="rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800"
          >
            <h3 className="font-display text-[20px] text-night dark:text-[#ECE7DD]">
              {p.title}
            </h3>
            <p className="mt-1 text-[16px] leading-normal text-warmgray dark:text-[#9A958B]">
              {p.body}
            </p>
          </article>
        ))}
      </div>

      {/* Espace confidence */}
      <section className="mt-6 rounded-cardlg bg-night p-5 dark:border dark:border-[#283655] dark:bg-[#1B2740]">
        <h2 className="font-display text-[22px] text-[#F4F1EA]">
          {t("confideTitle")}
        </h2>
        <p className="mt-1.5 text-[16px] leading-normal text-[#B9C0CE]">
          {t("confideBody")}
        </p>
        <div className="mt-3.5 flex gap-2.5">
          <Link
            href="/coach-ai"
            className="flex-1 rounded-btnsm bg-gold py-3 text-center text-[16px] font-semibold text-night"
          >
            {t("confideAi")}
          </Link>
          <Link
            href="/coaches"
            className="flex-1 rounded-btnsm border border-[#2E3A57] py-3 text-center text-[16px] font-medium text-[#D7DCE6]"
          >
            {t("confideHuman")}
          </Link>
        </div>
      </section>

      <ConfirmDialog
        open={seasonConfirm !== null}
        title={
          seasonConfirm === "PARENTS"
            ? t("childArrivedConfirmTitle")
            : t("marriedConfirmTitle")
        }
        body={
          seasonConfirm === "PARENTS"
            ? t("childArrivedConfirmBody")
            : t("marriedConfirmBody")
        }
        confirmLabel={tc("confirm")}
        onConfirm={async () => {
          if (seasonConfirm) await setSeason(seasonConfirm);
          setSeasonConfirm(null);
        }}
        onCancel={() => setSeasonConfirm(null)}
      />
    </main>
  );
}
