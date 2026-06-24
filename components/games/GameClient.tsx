"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/Spinner";
import { GameArena, type ArenaPersona, type ArenaQuestion } from "./GameArena";

/**
 * Coquille client d'Alliance Lab : ouvre une GameSession, puis fournit a
 * GameArena les callbacks onAnswer / onFinish branches sur les routes API.
 * Decouple : GameArena ignore tout du reseau.
 */
export function GameClient({
  persona,
  personaSlug,
  gameType,
  questions,
  isDisc,
}: {
  persona: ArenaPersona;
  personaSlug: string;
  gameType: "DISC" | "DEEP_QUESTIONS";
  questions: ArenaQuestion[];
  isDisc: boolean;
}) {
  const t = useTranslations("alliance_lab");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/games/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personaSlug, gameType }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.sessionId) setSessionId(d.sessionId);
        else setError(true);
      })
      .catch(() => setError(true));
  }, [personaSlug, gameType]);

  async function onAnswer(q: ArenaQuestion, userAnswer: string) {
    if (!sessionId) return null;
    const questionOrder = questions.findIndex((x) => x.key === q.key);
    const res = await fetch("/api/games/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionKey: q.key,
        questionPrompt: q.prompt,
        userAnswer,
        questionOrder,
      }),
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const d = (await res.json()) as { personaAnswer?: string | null };
    return d.personaAnswer ?? null;
  }

  async function onFinish() {
    if (!sessionId) return null;
    const res = await fetch("/api/games/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const d = (await res.json()) as { synthesis?: string | null };
    return d.synthesis ?? null;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-3 pt-10 text-center safe-top">
        <p className="text-[16px] text-warmgray dark:text-[#9A958B]">
          {t("badge.disclaimer")}
        </p>
      </main>
    );
  }

  if (!sessionId) {
    return (
      <main className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-3 pt-16 text-warmgray safe-top dark:text-[#9A958B]">
        <Spinner className="h-5 w-5" />
        {t("arena.start")}
      </main>
    );
  }

  return (
    <GameArena
      persona={persona}
      questions={questions}
      isDisc={isDisc}
      onAnswer={onAnswer}
      onFinish={onFinish}
    />
  );
}
