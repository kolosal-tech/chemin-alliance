import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  buildPortrait,
  INTERVIEW_QUESTIONS,
  portraitSchema,
} from "@/lib/agents/preparation";
import type { Locale } from "@/lib/core-engine";

const schema = z.object({
  consent: z.literal(true), // consentement RGPD explicite au profilage IA
  answers: z
    .array(z.object({ id: z.string(), answer: z.string().min(1).max(2000) }))
    .min(3),
});

export const GET = withErrors(async () => {
  const user = await requireUser();
  const insight = await prisma.agentInsight.findFirst({
    where: { userId: user.id, agentId: "preparation", revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const portrait = insight
    ? portraitSchema.safeParse(insight.dataJson)
    : null;
  return NextResponse.json({
    portrait: portrait?.success ? portrait.data : null,
    createdAt: insight?.createdAt ?? null,
  });
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(`prep:${user.id}`, 4, 60 * 60_000);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
  const body = schema.parse(await req.json());

  await prisma.consent.create({
    data: { userId: user.id, type: "AGENT_PROFILING" },
  });

  const answers = body.answers.flatMap((a) => {
    const q = INTERVIEW_QUESTIONS.find((x) => x.id === a.id);
    return q ? [{ id: a.id, dimension: q.dimension, answer: a.answer }] : [];
  });
  if (answers.length < 3) return jsonError(400, "ANSWERS_INVALID");

  const { portrait, viaLlm } = await buildPortrait(
    answers,
    (user.locale ?? "fr") as Locale,
  );

  await prisma.agentInsight.create({
    data: {
      userId: user.id,
      agentId: "preparation",
      kind: "PORTRAIT",
      dataJson: portrait,
      visibility: "PRIVATE",
    },
  });

  return NextResponse.json({ portrait, viaLlm });
});

/** Révocation RGPD : la personne peut effacer son portrait à tout moment. */
export const DELETE = withErrors(async () => {
  const user = await requireUser();
  await prisma.agentInsight.updateMany({
    where: { userId: user.id, agentId: "preparation", revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.consent.updateMany({
    where: { userId: user.id, type: "AGENT_PROFILING", revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
