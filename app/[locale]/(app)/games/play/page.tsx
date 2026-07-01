import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/security/page-auth";
import { prisma } from "@/lib/db";
import { GameClient } from "@/components/games/GameClient";
import { DISC_KEYS, DEEP_KEYS } from "@/lib/games/core";
import type { ArenaQuestion } from "@/components/games/GameArena";

export default async function PlayPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<{ persona?: string; game?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  setRequestLocale(params.locale);
  await requirePageUser(params.locale);

  const slug = searchParams?.persona;
  const gameType =
    searchParams?.game === "DEEP_QUESTIONS" ? "DEEP_QUESTIONS" : "DISC";
  if (!slug) notFound();

  const persona = await prisma.aiPersona.findUnique({ where: { slug } });
  if (!persona || !persona.active) notFound();

  const t = await getTranslations({
    locale: params.locale,
    namespace: "alliance_lab",
  });
  const isDisc = gameType === "DISC";
  const keys = isDisc ? DISC_KEYS : DEEP_KEYS;
  const questions: ArenaQuestion[] = keys.map((k) => ({
    key: k,
    prompt: t(`${k}.prompt`),
    options: isDisc
      ? { D: t(`${k}.D`), I: t(`${k}.I`), S: t(`${k}.S`), C: t(`${k}.C`) }
      : undefined,
  }));

  return (
    <GameClient
      persona={{
        displayName: persona.displayName,
        bio: persona.bio,
        avatarGradient: persona.avatarGradient,
      }}
      personaSlug={persona.slug}
      gameType={gameType}
      questions={questions}
      isDisc={isDisc}
    />
  );
}
