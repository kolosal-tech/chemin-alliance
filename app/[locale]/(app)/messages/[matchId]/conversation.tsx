"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { AllianceStage, MessageKind } from "@prisma/client";
import { StageBadge } from "@/components/StageBadge";
import { SacredMotif } from "@/components/SacredMotif";
import { BlockButton } from "@/components/BlockButton";
import { ReportButton } from "@/components/ReportButton";
import { SafetyBanner } from "@/components/SafetyBanner";

type Msg = {
  id: string;
  kind: MessageKind;
  mine: boolean;
  content: string;
  blocked: boolean;
};

/**
 * Messagerie — bulles en VERRE LIQUIDE translucide (cf. globals.css .glass*).
 * Les motifs sacrés transparaissent à travers le verre : c'est l'effet recherché.
 */
export function Conversation({
  matchId,
  stage,
  other,
  awaitingMyAccept,
  awaitingOther,
  suggestions,
  initialMessages,
}: {
  matchId: string;
  stage: AllianceStage;
  other: { id: string; displayName: string; isVerified: boolean };
  awaitingMyAccept?: boolean;
  awaitingOther?: boolean;
  suggestions: string[];
  initialMessages: Msg[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState(awaitingMyAccept ?? false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    // Marque la conversation comme lue à l'ouverture réelle (pas au prefetch
    // serveur du lien, qui exécuterait un render et fausserait le "lu").
    fetch(`/api/matches/${matchId}/mark-read`, { method: "POST" }).catch(
      () => {},
    );
  }, [matchId]);

  async function acceptMatch() {
    if (acceptBusy) return;
    setAcceptBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        setPending(false);
        router.refresh();
      } else {
        setActionError(t("messaging.actionFailed"));
      }
    } catch {
      setActionError(t("messaging.actionFailed"));
    } finally {
      setAcceptBusy(false);
    }
  }

  async function declineMatch() {
    if (acceptBusy) return;
    setAcceptBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: t("messaging.declineMessage") }),
      });
      if (res.ok) {
        router.push("/messages");
        router.refresh();
      } else {
        setActionError(t("messaging.actionFailed"));
        setAcceptBusy(false);
      }
    } catch {
      setActionError(t("messaging.actionFailed"));
      setAcceptBusy(false);
    }
  }
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // id du message dont on demande confirmation de suppression (null = aucun).
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Supprimer SON message (corriger une erreur). Optimiste : on retire la bulle
  // dès l'accusé OK du serveur ; on peut ensuite renvoyer un message corrigé.
  async function deleteMessage(id: string) {
    const res = await fetch(`/api/matches/${matchId}/messages/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessages((m) => m.filter((x) => x.id !== id));
    }
    setConfirmId(null);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setBusy(false);
    if (!res.ok && res.status !== 200) return;
    const data = await res.json();
    if (data.blocked) {
      setMessages((m) => [
        ...m,
        {
          id: data.messageId,
          kind: "USER",
          mine: true,
          content: text,
          blocked: true,
        },
        {
          id: data.systemMessageId,
          kind: "SYSTEM",
          mine: true,
          content: data.systemMessage,
          blocked: false,
        },
      ]);
    } else {
      setMessages((m) => [
        ...m,
        {
          id: data.messageId,
          kind: "USER",
          mine: true,
          content: text,
          blocked: false,
        },
      ]);
    }
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-30 mx-auto flex w-full max-w-md flex-col bg-cream dark:bg-anthracite-900 lg:left-60 lg:max-w-2xl">
      <SacredMotif variant="olive" className="left-[-60px] top-[180px]" />
      <SacredMotif variant="dove" className="right-[-100px] bottom-[200px]" />

      {/* Header verre */}
      <header className="glass safe-top z-30 flex items-center gap-3 border-b border-sand-200/50 px-4 py-3 dark:border-anthracite-600/50">
        <Link href="/messages" aria-label={t("common.back")} className="p-1">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-warmgray dark:text-[#9A958B]"
            />
          </svg>
        </Link>
        <span
          aria-hidden
          className="h-9 w-9 flex-none rounded-full blur-[3px]"
          style={{
            background:
              "radial-gradient(110% 90% at 40% 30%, #8A7A6A 0%, #5C4D44 60%, #352A28 100%)",
          }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[17px] text-night dark:text-[#ECE7DD]">
              {other.displayName}
            </span>
            {other.isVerified && (
              <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
                  className="fill-gold dark:fill-gold-light"
                />
              </svg>
            )}
          </div>
          <div className="mt-0.5">
            <StageBadge stage={stage} />
          </div>
        </div>
        <Link
          href={`/alliance/${matchId}`}
          className="flex flex-none items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11px] font-semibold text-gold-deep transition-colors hover:bg-gold/20 dark:border-gold-light/30 dark:bg-gold-light/10 dark:text-gold-light"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          {t("nav.path")}
        </Link>
        <ReportButton targetUserId={other.id} />
        <BlockButton targetUserId={other.id} targetName={other.displayName} />
      </header>

      <SafetyBanner matchId={matchId} />

      {pending && (
        <div className="mx-3 mt-3 rounded-card border border-gold/50 bg-[#FBF6E9]/80 p-4 dark:border-gold-light/40 dark:bg-[#272117]/70">
          <p className="text-[13.5px] leading-snug text-[#6F5C2E] dark:text-[#C2B488]">
            {t("messaging.acceptPrompt", { name: other.displayName })}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={acceptMatch}
              disabled={acceptBusy}
              className="flex-1 rounded-btnsm bg-navy py-2.5 text-[13px] font-semibold text-[#F4F1EA] disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("messaging.acceptCta")}
            </button>
            <button
              type="button"
              onClick={declineMatch}
              disabled={acceptBusy}
              className="rounded-btnsm border border-sand-300 px-4 py-2.5 text-[13px] font-medium text-warmgray disabled:opacity-60 dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("messaging.declineCta")}
            </button>
          </div>
          {actionError && (
            <p role="alert" className="mt-2 text-[12.5px] text-danger">
              {actionError}
            </p>
          )}
        </div>
      )}
      {awaitingOther && !pending && (
        <p className="mx-3 mt-3 rounded-card border border-sand-200 bg-surface px-4 py-3 text-[12.5px] text-warmgray dark:border-anthracite-600 dark:bg-anthracite-800 dark:text-[#9A958B]">
          {t("messaging.awaitingOther", { name: other.displayName })}
        </p>
      )}

      {/* Messages — verre liquide. min-h-0 indispensable : sans lui, flex-1
          ne se contraint pas, la colonne déborde et le bloc de saisie collant
          recouvre les derniers messages. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 pb-2 [&>*]:shrink-0">
        {messages.length === 0 && (
          <p className="mx-auto mt-8 max-w-[32ch] text-center text-sm text-sand-600 dark:text-[#7E7A72]">
            {t("messaging.emptyState")}
          </p>
        )}
        {messages.map((m) => {
          if (m.kind === "SYSTEM") {
            return (
              <div
                key={m.id}
                role="status"
                className="glass glass-bubble max-w-[90%] self-center rounded-[14px] border-[#EAD9A8]/70 bg-[#FBF6E9]/70 px-4 py-3 dark:border-[#463A1F]/70 dark:bg-[#272117]/60"
              >
                <div className="flex gap-2.5">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mt-0.5 flex-none"
                    aria-hidden
                  >
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="9"
                      rx="2"
                      stroke="#9A7B2E"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 11V8a4 4 0 0 1 8 0v3"
                      stroke="#9A7B2E"
                      strokeWidth="1.7"
                    />
                    <circle cx="12" cy="15.5" r="1.3" fill="#9A7B2E" />
                  </svg>
                  <div>
                    <div className="mb-0.5 text-[13px] font-semibold text-gold-ink dark:text-[#E0C77A]">
                      {t("messaging.contactPendingTitle")}
                    </div>
                    <p className="text-[12.5px] leading-normal text-[#6F5C2E] dark:text-[#C2B488]">
                      {m.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          const text = (
            <p
              className={`text-sm leading-snug ${
                m.mine ? "text-[#EDEFF3]" : "text-[#2A2823] dark:text-[#CFCAC0]"
              } ${m.blocked ? "line-through decoration-[#9B4A3E]/60" : ""}`}
            >
              {m.content}
            </p>
          );

          // Message reçu : bulle simple alignée à gauche.
          if (!m.mine) {
            return (
              <div
                key={m.id}
                className={`glass glass-bubble max-w-[78%] self-start rounded-[18px] rounded-tl-[4px] px-3.5 py-2.5 ${
                  m.blocked ? "opacity-60" : ""
                }`}
              >
                {text}
              </div>
            );
          }

          // Mon message : bulle + icône corbeille (corriger une erreur).
          return (
            <div
              key={m.id}
              className="flex max-w-[85%] flex-col items-end gap-1 self-end"
            >
              <div className="flex items-end gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmId((c) => (c === m.id ? null : m.id))
                  }
                  aria-label={t("messaging.delete")}
                  className="mb-1 flex-none rounded-full p-1 text-warmgray/55 transition-colors hover:text-danger dark:text-[#7E7A72]"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div
                  className={`glass-bubble glass-self min-w-0 rounded-[18px] rounded-tr-[4px] px-3.5 py-2.5 ${
                    m.blocked ? "opacity-60" : ""
                  }`}
                >
                  {text}
                </div>
              </div>
              {confirmId === m.id && (
                <div
                  role="group"
                  className="flex items-center gap-2.5 pr-1 text-[11.5px]"
                >
                  <span className="text-warmgray dark:text-[#9A958B]">
                    {t("messaging.deleteConfirm")}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMessage(m.id)}
                    className="font-semibold text-danger"
                  >
                    {t("messaging.delete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="text-warmgray dark:text-[#9A958B]"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Suggestions IA + saisie — verre. Masqué tant que la rencontre n'est
          pas acceptée par le destinataire (il doit d'abord accepter). */}
      <div
        className={`glass z-30 border-t border-sand-200/50 px-3.5 pb-[calc(env(safe-area-inset-bottom)+88px)] lg:pb-4 pt-2.5 dark:border-anthracite-600/50 ${
          pending ? "hidden" : ""
        }`}
      >
        {suggestions.length > 0 && (
          <>
            <div className="mb-2 flex items-center gap-1.5">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                  fill="#9A7B2E"
                />
              </svg>
              <span className="lbl text-[8.5px] text-gold-deep dark:text-gold-light">
                {t("messaging.aiSuggestions")}
              </span>
            </div>
            <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="glass whitespace-nowrap rounded-[18px] px-3 py-2 text-xs text-[#3A372F] dark:text-[#CFCAC0]"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="glass flex items-center gap-2 rounded-[24px] border border-sand-300 py-1.5 pl-4 pr-1.5 dark:border-anthracite-600 dark:bg-anthracite-800/80"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("messaging.placeholder")}
            aria-label={t("messaging.placeholder")}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-sand-500 dark:text-[#ECE7DD] dark:placeholder:text-[#65625B]"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={t("messaging.send")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy disabled:opacity-50 dark:bg-gold-light"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 12h13M12 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#F4F1EA] dark:text-anthracite-900"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
