import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { callLLM } from "@/lib/llm/gateway";
import { canSeeField } from "@/lib/visibility";
import type { Locale } from "@/lib/core-engine";

export const runtime = "nodejs";

const SYSTEM: Record<Locale, string> = {
  fr: "Tu es un assistant bienveillant qui aide deux chrétiens à mieux se connaître dans le cadre d'une démarche de mariage. Génère UNE SEULE question ouverte, personnalisée, courte (1 phrase max), que l'utilisateur pourrait poser à son interlocuteur pour engager une vraie conversation. Réponds uniquement avec la question, sans guillemets ni ponctuation finale.",
  en: "You are a caring assistant helping two Christians get to know each other in the context of a marriage journey. Generate ONE short open-ended question (1 sentence max) that the user could ask their match to start a real conversation. Reply with the question only, no quotes, no trailing punctuation.",
  es: "Eres un asistente amable que ayuda a dos cristianos a conocerse mejor en el contexto de un camino hacia el matrimonio. Genera UNA sola pregunta abierta, personalizada y breve (1 frase máximo), que el usuario podría hacerle a su interlocutor para iniciar una conversación real. Responde solo con la pregunta, sin comillas ni puntuación final.",
  pt: "És um assistente atencioso que ajuda dois cristãos a conhecerem-se melhor no âmbito de um caminho para o casamento. Gera UMA única pergunta aberta, personalizada e breve (1 frase no máximo), que o utilizador poderia fazer ao seu interlocutor para iniciar uma conversa real. Responde apenas com a pergunta, sem aspas nem pontuação final.",
};

export const POST = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");

    const { matchId } = await params;
    const rl = await rateLimit(
      `icebreaker:${user.id}:${matchId}`,
      LIMITS.icebreaker.limit,
      LIMITS.icebreaker.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const match = await requireMatchMember(matchId, user.id);
    const otherId = match.userAId === user.id ? match.userBId : match.userAId;

    const [me, other] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          displayName: true,
          country: true,
          relationshipProfile: {
            select: {
              interests: true,
              aspirations: true,
              intentionStatement: true,
            },
          },
          faithProfile: { select: { denomination: true, ministry: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: otherId },
        select: {
          kind: true,
          displayName: true,
          country: true,
          relationshipProfile: {
            select: {
              interests: true,
              aspirations: true,
              intentionStatement: true,
              intentionVisibility: true,
            },
          },
          faithProfile: { select: { denomination: true } },
        },
      }),
    ]);

    if (other?.kind === "AI_COMPANION") {
      return jsonError(403, "NOT_SUPPORTED_FOR_COMPANION");
    }

    const locale = (user.locale ?? "fr") as Locale;

    const parts: string[] = [];
    if (me?.displayName) parts.push(`Moi : ${me.displayName}`);
    if (me?.country) parts.push(`Pays : ${me.country}`);
    if (me?.faithProfile?.denomination)
      parts.push(`Dénomination : ${me.faithProfile.denomination}`);
    if (me?.faithProfile?.ministry)
      parts.push(`Ministère : ${me.faithProfile.ministry}`);
    if (me?.relationshipProfile?.interests)
      parts.push(`Mes intérêts : ${me.relationshipProfile.interests}`);
    if (me?.relationshipProfile?.aspirations)
      parts.push(`Mes aspirations : ${me.relationshipProfile.aspirations}`);
    if (other?.displayName)
      parts.push(`\nInterlocuteur·rice : ${other.displayName}`);
    if (other?.country) parts.push(`Pays : ${other.country}`);
    if (other?.faithProfile?.denomination)
      parts.push(`Dénomination : ${other.faithProfile.denomination}`);
    if (other?.relationshipProfile?.interests)
      parts.push(`Ses intérêts : ${other.relationshipProfile.interests}`);
    const otherIntentionVisible = other?.relationshipProfile
      ? canSeeField(other.relationshipProfile.intentionVisibility, {
          matched: true,
          stage: match.stage,
        })
      : false;
    if (otherIntentionVisible && other?.relationshipProfile?.intentionStatement)
      parts.push(`Sa vision : ${other.relationshipProfile.intentionStatement}`);

    const userPrompt = parts.join("\n");

    const question = await callLLM({
      system: SYSTEM[locale],
      user: userPrompt || "Profils non renseignés.",
      step: "discovery",
      maxTokens: 80,
      locale,
      redact: false,
    });

    return NextResponse.json({ question });
  },
);
