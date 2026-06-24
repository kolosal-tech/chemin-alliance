"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { AllianceStage, MessageKind } from "@prisma/client";
import { StageBadge } from "@/components/StageBadge";
import { MemberAvatar } from "@/components/MemberAvatar";
import { SacredMotif } from "@/components/SacredMotif";
import { BlockButton } from "@/components/BlockButton";
import { ReportButton } from "@/components/ReportButton";
import { SafetyBanner } from "@/components/SafetyBanner";
import { AllianceMoment } from "@/components/AllianceMoment";
import { AsyncButton } from "@/components/AsyncButton";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

type Msg = {
  id: string;
  kind: MessageKind;
  mine: boolean;
  content: string;
  blocked: boolean;
  createdAt: string;
};

/**
 * Messagerie - bulles en VERRE LIQUIDE translucide (cf. globals.css .glass*).
 * Les motifs sacrés transparaissent à travers le verre : c'est l'effet recherché.
 */
export function Conversation({
  matchId,
  stage,
  other,
  isCompanion,
  awaitingMyAccept,
  awaitingOther,
  suggestions,
  initialMessages,
}: {
  matchId: string;
  stage: AllianceStage;
  other: {
    id: string;
    displayName: string;
    isVerified: boolean;
    photoBlurhash: string | null;
  };
  /** Le correspondant est un Compagnon IA (badge + reponses automatiques). */
  isCompanion?: boolean;
  awaitingMyAccept?: boolean;
  awaitingOther?: boolean;
  suggestions: string[];
  initialMessages: Msg[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  // Horodatage hors bulle (heure courte localisée), comme la messagerie couple.
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };
  const [pending, setPending] = useState(awaitingMyAccept ?? false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    // Marque la conversation comme lue à l'ouverture réelle (pas au prefetch
    // serveur du lien, qui exécuterait un render et fausserait le "lu").
    // Puis : rafraîchit le badge nav tout de suite (sans attendre le poll 25 s)
    // et efface les notifications push iOS de ce fil (iOS ne les retire pas
    // tout seul à la lecture).
    fetch(`/api/matches/${matchId}/mark-read`, { method: "POST" })
      .then(() => window.dispatchEvent(new Event("unread:refresh")))
      .catch(() => {});
    navigator.serviceWorker?.ready
      .then((reg) => reg.getNotifications({ tag: `msg-${matchId}` }))
      .then((list) => list.forEach((n) => n.close()))
      .catch(() => {});
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
        setCelebrate(true); // « moment d'alliance » ; refresh à la continuation
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
    try {
      const res = await fetch(`/api/matches/${matchId}/messages/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((m) => m.filter((x) => x.id !== id));
      } else {
        toast.error(t("messaging.actionFailed"));
      }
    } catch {
      toast.error(t("messaging.actionFailed"));
    } finally {
      setConfirmId(null);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    let res: Response;
    try {
      res = await fetch(`/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
    } catch {
      setBusy(false);
      toast.error(t("messaging.sendError"));
      return;
    }
    setBusy(false);
    if (!res.ok) {
      toast.error(t("messaging.sendError"));
      return;
    }
    const data = await res.json().catch(() => null);
    if (!data) {
      toast.error(t("messaging.sendError"));
      return;
    }
    if (data.blocked) {
      setMessages((m) => [
        ...m,
        {
          id: data.messageId,
          kind: "USER",
          mine: true,
          content: text,
          blocked: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: data.systemMessageId,
          kind: "SYSTEM",
          mine: true,
          content: data.systemMessage,
          blocked: false,
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
        },
      ]);
      // Compagnon IA : la reponse automatique est renvoyee par l'API, on
      // l'affiche immediatement comme un message recu (pas de poll a attendre).
      if (data.companionReply) {
        setMessages((m) => [
          ...m,
          {
            id: data.companionReply.id,
            kind: "USER",
            mine: false,
            content: data.companionReply.content,
            blocked: false,
            createdAt: data.companionReply.createdAt,
          },
        ]);
      }
    }
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-30 mx-auto flex w-full max-w-md flex-col bg-cream dark:bg-anthracite-900 lg:left-60 lg:max-w-2xl">
      <SacredMotif variant="olive" className="left-[-60px] top-[180px]" />
      <SacredMotif variant="dove" className="right-[-100px] bottom-[200px]" />

      {/* Header verre */}
      <header className="glass safe-top z-30 flex items-center gap-3 border-b border-sand-200/50 px-3 py-3 dark:border-anthracite-600/50">
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
        <MemberAvatar
          userId={other.id}
          photoBlurhash={other.photoBlurhash}
          className="h-9 w-9 flex-none rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-display text-[20px] text-night dark:text-[#ECE7DD]">
              {other.displayName}
            </span>
            {isCompanion ? (
              // Profil IA : on n'affiche JAMAIS le sceau de verification humaine
              // (trompeur). A la place, un badge clair "Compagnon IA".
              <span className="flex flex-none items-center gap-1 rounded-full border border-[#8C7DB8]/55 bg-[#EDE9F6] px-2 py-0.5 text-[11px] font-semibold text-[#5B4F87] dark:border-gold-light/30 dark:bg-gold-light/10 dark:text-gold-light">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3Z"
                    fill="currentColor"
                  />
                </svg>
                {t("discovery_ecosystem.companionBadge")}
              </span>
            ) : (
              other.isVerified && (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="flex-none"
                >
                  <path
                    d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
                    className="fill-gold dark:fill-gold-light"
                  />
                </svg>
              )
            )}
          </div>
          <div className="mt-0.5">
            <StageBadge stage={stage} />
          </div>
        </div>
        <Link
          href={`/alliance/${matchId}`}
          aria-label={t("nav.path")}
          className="flex flex-none items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[13px] font-semibold text-gold-deep transition-colors hover:bg-gold/20 dark:border-gold-light/30 dark:bg-gold-light/10 dark:text-gold-light"
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
          <span className="hidden min-[420px]:inline">{t("nav.path")}</span>
        </Link>
        <ReportButton targetUserId={other.id} />
        <BlockButton targetUserId={other.id} targetName={other.displayName} />
      </header>

      {/* Compagnon IA : rappel de transparence PERSISTANT, en bandeau pleine
          largeur sous l'en-tete (jamais inline dans l'en-tete, qui deborderait
          sur etroit). Le badge "Compagnon IA" reste, lui, dans l'en-tete. */}
      {isCompanion && (
        <div className="flex items-center justify-center gap-1.5 border-b border-[#8C7DB8]/25 bg-[#EDE9F6]/50 px-3 py-1.5 text-center text-[12px] text-[#5B4F87] dark:border-gold-light/15 dark:bg-gold-light/[0.06] dark:text-gold-light">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="flex-none"
          >
            <path
              d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3Z"
              fill="currentColor"
            />
          </svg>
          {t("discovery_ecosystem.notRealPerson")}
        </div>
      )}

      <SafetyBanner matchId={matchId} />

      {celebrate && (
        <AllianceMoment
          name={other.displayName}
          onContinue={() => {
            setCelebrate(false);
            router.refresh();
          }}
        />
      )}

      {pending && (
        <div className="mx-3 mt-3 rounded-card border border-info-border bg-info-surface/80 p-4 dark:border-info-darkBorder dark:bg-info-darkSurface/70">
          <p className="text-[16px] leading-snug text-info-ink dark:text-info-darkInk">
            {t("messaging.acceptPrompt", { name: other.displayName })}
          </p>
          <div className="mt-3 flex gap-2">
            <AsyncButton
              onClick={acceptMatch}
              disabled={acceptBusy}
              className="flex-1 rounded-btnsm bg-navy py-2.5 text-[16px] font-semibold text-navy-foreground disabled:opacity-60 dark:bg-gold-light dark:text-anthracite-900"
            >
              {t("messaging.acceptCta")}
            </AsyncButton>
            <AsyncButton
              onClick={declineMatch}
              disabled={acceptBusy}
              className="rounded-btnsm border border-sand-300 px-3 py-2.5 text-[16px] font-medium text-warmgray disabled:opacity-60 dark:border-anthracite-600 dark:text-[#9A958B]"
            >
              {t("messaging.declineCta")}
            </AsyncButton>
          </div>
          {actionError && (
            <p role="alert" className="mt-2 text-[15px] text-danger">
              {actionError}
            </p>
          )}
        </div>
      )}
      {awaitingOther && !pending && (
        <p className="mx-3 mt-3 rounded-card border border-info-border bg-info-surface px-3 py-3 text-[15px] text-info-ink dark:border-info-darkBorder dark:bg-info-darkSurface dark:text-info-darkInk">
          {t("messaging.awaitingOther", { name: other.displayName })}
        </p>
      )}

      {/* Messages - verre liquide. min-h-0 indispensable : sans lui, flex-1
          ne se contraint pas, la colonne déborde et le bloc de saisie collant
          recouvre les derniers messages. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4 pb-2 [&>*]:shrink-0">
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
                className="glass glass-bubble max-w-[90%] self-center rounded-[14px] border-warn-border/70 bg-warn-surface/70 px-3 py-3 dark:border-warn-darkBorder/70 dark:bg-warn-darkSurface/60"
              >
                <div className="flex gap-2.5">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mt-0.5 flex-none text-warn dark:text-warn-darkInk"
                    aria-hidden
                  >
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="9"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 11V8a4 4 0 0 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <circle cx="12" cy="15.5" r="1.3" fill="currentColor" />
                  </svg>
                  <div>
                    <div className="mb-0.5 text-[16px] font-semibold text-warn-ink dark:text-warn-darkInk">
                      {t("messaging.contactPendingTitle")}
                    </div>
                    <p className="text-[15px] leading-normal text-warn-ink dark:text-warn-darkInk">
                      {m.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          const text = (
            // Bulle envoyée : on laisse `.glass-self` (globals.css) gérer la
            // couleur du texte, qui est déjà adaptée au thème (#18243f en clair,
            // #eaf0fa en sombre). Forcer une couleur ici cassait le contraste
            // (texte quasi blanc sur bulle bleu pâle en mode clair).
            <p
              className={`text-sm leading-snug ${
                m.mine ? "" : "text-[#2A2823] dark:text-[#CFCAC0]"
              } ${m.blocked ? "line-through decoration-[#9B4A3E]/60" : ""}`}
            >
              {m.content}
            </p>
          );

          // Message reçu : bulle simple alignée à gauche + heure dessous.
          if (!m.mine) {
            return (
              <div
                key={m.id}
                className="flex max-w-[78%] flex-col items-start gap-0.5 self-start"
              >
                <div
                  className={`glass glass-bubble rounded-[18px] rounded-tl-[4px] px-3.5 py-2.5 ${
                    m.blocked ? "opacity-60" : ""
                  }`}
                >
                  {text}
                </div>
                <span className="px-1 text-[11px] text-warmgray dark:text-[#7E7A72]">
                  {fmtTime(m.createdAt)}
                </span>
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
              <span className="px-1 text-[11px] text-warmgray dark:text-[#7E7A72]">
                {fmtTime(m.createdAt)}
              </span>
              {confirmId === m.id && (
                <div
                  role="group"
                  className="flex items-center gap-2.5 pr-1 text-[14px]"
                >
                  <span className="text-warmgray dark:text-[#9A958B]">
                    {t("messaging.deleteConfirm")}
                  </span>
                  <AsyncButton
                    onClick={() => deleteMessage(m.id)}
                    className="font-semibold text-danger"
                  >
                    {t("messaging.delete")}
                  </AsyncButton>
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

      {/* Suggestions IA + saisie - verre. Masqué tant que la rencontre n'est
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
              <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
                {t("messaging.aiSuggestions")}
              </span>
            </div>
            <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5">
              {suggestions.map((s) => (
                <AsyncButton
                  key={s}
                  onClick={() => send(s)}
                  className="glass whitespace-nowrap rounded-[18px] px-3 py-2 text-xs text-[#3A372F] dark:text-[#CFCAC0]"
                >
                  {s}
                </AsyncButton>
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
            {busy ? (
              <Spinner className="h-4 w-4 text-[#F4F1EA] dark:text-anthracite-900" />
            ) : (
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
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
