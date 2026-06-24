import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/session";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { regionFromRequest } from "@/lib/games/core";

// Le LLM (routes answer/finish) requiert le runtime Node ; on l'aligne ici aussi.
export const runtime = "nodejs";

const schema = z.object({
  personaSlug: z.string().min(1).max(64),
  gameType: z.enum(["DISC", "DEEP_QUESTIONS"]),
});

/** Ouvre une partie Alliance Lab : capte la locale + la region IP (geo-conscience). */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { personaSlug, gameType } = schema.parse(await readJsonLimited(req));

  const persona = await prisma.aiPersona.findUnique({
    where: { slug: personaSlug },
    select: { id: true, active: true },
  });
  if (!persona || !persona.active) return jsonError(404, "PERSONA_NOT_FOUND");

  const session = await prisma.gameSession.create({
    data: {
      userId: user.id,
      personaId: persona.id,
      gameType,
      locale: user.locale ?? "fr",
      region: regionFromRequest(req),
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });

  return NextResponse.json({ sessionId: session.id });
});
