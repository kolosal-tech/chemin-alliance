"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SacredMotif } from "@/components/SacredMotif";
import { RichText } from "@/components/RichText";
import { Spinner } from "@/components/Spinner";

type Entry = {
  id: string;
  role: "user" | "coach";
  text: string;
  guardrail?: boolean;
  mode: "individual" | "couple";
  createdAt?: string;
};

export function CoachChat({
  initialEntries = [],
}: {
  initialEntries?: Entry[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);
  // Jetons gratuits restants aujourd'hui (null = premium illimité / pas encore su).
  const [remaining, setRemaining] = useState<number | null>(null);
  const [mode, setMode] = useState<"individual" | "couple">("individual");
  const [error, setError] = useState<string | null>(null);
  // Dernière question dont l'envoi a échoué : permet « Réessayer » sans
  // ré-ajouter une bulle utilisateur en double.
  const [lastQ, setLastQ] = useState<string | null>(null);

  // Défilement automatique vers le bas dès qu'un message arrive ou que l'IA
  // commence à répondre : la dernière bulle reste toujours visible.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries, busy]);

  // Horodatage minimal HH:MM dans la locale de l'utilisateur.
  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  async function send(q: string) {
    setError(null);
    setLastQ(q);
    setBusy(true);
    try {
      const res = await fetch("/api/ai-coach/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, mode }),
        // Borne le temps d'attente : sans timeout, un réseau qui pend laisse
        // l'utilisateur sur un spinner infini.
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(t("aiCoach.error"));
        return;
      }
      if (data.quotaExceeded) {
        setQuota(data.limit);
        setRemaining(0);
        return;
      }
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (data.text) {
        setEntries((s) => [
          ...s,
          {
            id: crypto.randomUUID(),
            role: "coach",
            text: data.text,
            guardrail: data.guardrail,
            mode,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setError(t("aiCoach.error"));
      }
    } catch {
      // Timeout, perte réseau, JSON illisible : on le dit, on n'échoue pas en silence.
      setError(t("aiCoach.error"));
    } finally {
      setBusy(false);
    }
  }

  function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    setEntries((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: q,
        mode,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    void send(q);
  }

  return (
    <div className="fixed inset-0 z-30 mx-auto flex w-full max-w-md flex-col bg-cream dark:bg-anthracite-900 lg:left-60 lg:max-w-2xl">
      <SacredMotif variant="flame" className="right-[-90px] top-[160px]" />
      <header className="glass safe-top z-30 border-b border-sand-200/50 px-4 pb-3 pt-3 dark:border-anthracite-600/50">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-night dark:bg-gold-light">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                className="fill-gold dark:fill-anthracite-900"
              />
            </svg>
          </div>
          <div>
            <div className="font-display text-lg text-night dark:text-[#ECE7DD]">
              {t("aiCoach.title")}
            </div>
            <div className="text-[13px] text-sand-600 dark:text-[#7E7A72]">
              {t("aiCoach.subtitle")}
            </div>
          </div>
        </div>
        <div
          className="flex rounded-btnsm bg-sand-100 p-[3px] dark:bg-anthracite-700"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "individual"}
            onClick={() => setMode("individual")}
            className={`flex-1 rounded-[8px] py-1.5 text-[15px] font-semibold ${
              mode === "individual"
                ? "bg-surface text-night shadow-sm dark:bg-anthracite-600 dark:text-[#ECE7DD]"
                : "text-sand-600 dark:text-[#7E7A72]"
            }`}
          >
            {t("aiCoach.modeIndividual")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "couple"}
            onClick={() => setMode("couple")}
            className={`flex-1 rounded-[8px] py-1.5 text-[15px] font-medium ${
              mode === "couple"
                ? "bg-surface text-night shadow-sm dark:bg-anthracite-600 dark:text-[#ECE7DD]"
                : "text-sand-600 dark:text-[#7E7A72]"
            }`}
          >
            {t("aiCoach.modeCouple")}{" "}
            <span className="text-[11px]">· {t("aiCoach.modeCoupleHint")}</span>
          </button>
        </div>
      </header>

      {/* min-h-0 contraint le scroller ; [&>*]:shrink-0 empêche les bulles de
          se comprimer (sinon, contenu > hauteur => flex-shrink écrase et coupe
          le texte, ex. le bandeau overflow-hidden) - on veut qu'elles scrollent. */}
      {/* role=log + aria-live : les réponses du coach ajoutées au fil sont
          annoncées aux lecteurs d'écran (pas seulement la bulle « répond… »). */}
      <div
        role="log"
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 [&>*]:shrink-0"
      >
        {/* Bandeau de transparence - obligatoire */}
        <div
          className="glass glass-bubble rounded-[13px] border-[#D4DAE4]/70 bg-[#EAEDF2]/70 px-4 py-3 dark:border-[#2A3A56]/70 dark:bg-[#1A2233]/60"
          role="note"
        >
          <div className="flex gap-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 flex-none text-navy dark:text-[#8FA6D0]"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M12 11v5M12 8h.01"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-[15px] leading-normal text-[#2A3550] dark:text-[#B9C6E0]">
              {t("common.aiTransparency")}
            </p>
          </div>
        </div>

        {entries
          .filter((ent) => ent.mode === mode)
          .map((e) =>
            e.role === "user" ? (
              <div
                key={e.id}
                className="flex max-w-[80%] flex-col items-end self-end"
              >
                <div className="glass-self glass-bubble rounded-[14px] rounded-tr-[4px] px-3.5 py-2.5">
                  <p className="text-[16px] leading-normal text-info-ink dark:text-info-darkInk">
                    {e.text}
                  </p>
                </div>
                {fmtTime(e.createdAt) && (
                  <span className="mt-1 px-1 text-right text-[12px] text-sand-500 dark:text-[#65625B]">
                    {fmtTime(e.createdAt)}
                  </span>
                )}
              </div>
            ) : e.guardrail ? (
              <div
                key={e.id}
                className="max-w-[90%] self-start rounded-[14px] border border-warn-border bg-warn-surface p-3.5 dark:border-warn-darkBorder dark:bg-warn-darkSurface"
              >
                <div className="mb-2 flex items-center gap-2 text-warn dark:text-warn-darkInk">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M12 3l9 16H3L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 10v4M12 16.5h.01"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[15px] font-semibold text-warn-ink dark:text-warn-darkInk">
                    {t("aiCoach.guardrailTitle")}
                  </span>
                </div>
                <p className="mb-2.5 text-[15px] leading-normal text-warn-ink dark:text-warn-darkInk">
                  {e.text}
                </p>
                <Link
                  href="/coaches"
                  className="block w-full rounded-[10px] border border-warn-border bg-surface py-2.5 text-center text-[16px] font-semibold text-warn-ink dark:border-warn-darkBorder dark:bg-anthracite-800 dark:text-warn-darkInk"
                >
                  {t("aiCoach.guardrailCta")}
                </Link>
              </div>
            ) : (
              <div key={e.id} className="flex max-w-[88%] flex-col self-start">
                <div className="flex gap-2.5">
                  <div className="mt-0.5 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-night dark:bg-gold-light">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                        className="fill-gold dark:fill-anthracite-900"
                      />
                    </svg>
                  </div>
                  <div className="glass glass-bubble rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5">
                    <RichText
                      text={e.text}
                      className="text-[16px] leading-normal text-[#2A2823] dark:text-[#CFCAC0]"
                    />
                  </div>
                </div>
                {fmtTime(e.createdAt) && (
                  <span className="ml-[36px] mt-1 px-1 text-[12px] text-sand-500 dark:text-[#65625B]">
                    {fmtTime(e.createdAt)}
                  </span>
                )}
              </div>
            ),
          )}

        {/* Indicateur « l'IA répond… » - bulle coach temporaire pendant l'attente. */}
        {busy && (
          <div
            className="flex max-w-[88%] gap-2.5 self-start"
            aria-live="polite"
          >
            <div className="mt-0.5 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-night dark:bg-gold-light">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
                  className="fill-gold dark:fill-anthracite-900"
                />
              </svg>
            </div>
            <div className="glass glass-bubble flex items-center gap-2 rounded-[14px] rounded-tl-[4px] px-3.5 py-2.5">
              <Spinner className="h-3.5 w-3.5 text-warmgray dark:text-[#9A958B]" />
              <span className="text-[16px] italic text-warmgray dark:text-[#9A958B]">
                {t("aiCoach.responding")}
              </span>
            </div>
          </div>
        )}

        {/* Échec réseau / timeout : message explicite + réessai (jamais silencieux). */}
        {error && (
          <div
            role="alert"
            className="self-start rounded-[13px] border border-[#E7C3BD] bg-[#FBEEEC] px-4 py-3 dark:border-[#5A2A22] dark:bg-[#2A1714]"
          >
            <p className="text-[15px] leading-normal text-danger dark:text-[#E59B91]">
              {error}
            </p>
            {lastQ && (
              <button
                type="button"
                onClick={() => void send(lastQ)}
                disabled={busy}
                className="mt-2 text-[15px] font-semibold text-danger underline underline-offset-2 disabled:opacity-50 dark:text-[#E59B91]"
              >
                {t("aiCoach.retry")}
              </button>
            )}
          </div>
        )}

        {quota !== null ? (
          <p
            role="status"
            className="rounded-[13px] border border-warn-border bg-warn-surface px-4 py-3 text-[15px] text-warn-ink dark:border-warn-darkBorder dark:bg-warn-darkSurface dark:text-warn-darkInk"
          >
            {t("aiCoach.quotaReached", { limit: quota })}
          </p>
        ) : (
          remaining !== null &&
          remaining <= 2 && (
            <p
              role="status"
              className="text-center text-[14px] text-sand-600 dark:text-[#7E7A72]"
            >
              {t("aiCoach.quotaRemaining", { remaining })}
            </p>
          )
        )}

        <div ref={bottomRef} aria-hidden />
      </div>

      <div className="glass z-30 border-t border-sand-200/50 px-3.5 pb-[calc(env(safe-area-inset-bottom)+88px)] lg:pb-4 pt-3 dark:border-anthracite-600/50">
        <form
          onSubmit={ask}
          className="glass flex items-center gap-2 rounded-[24px] border border-sand-300 py-1.5 pl-4 pr-1.5 dark:border-anthracite-600 dark:bg-anthracite-800/80"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("aiCoach.placeholder")}
            aria-label={t("aiCoach.placeholder")}
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
