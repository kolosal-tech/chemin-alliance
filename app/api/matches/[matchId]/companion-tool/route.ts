import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember } from "@/lib/alliance";
import { encryptField } from "@/lib/security/crypto";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import {
  DISCERNMENT_COUNT,
  isDiscernmentModule,
} from "@/lib/companions/discernment";

// getTranslations + chiffrement requierent le runtime Node.
export const runtime = "nodejs";

const schema = z.object({
  module: z.string().min(1),
  index: z.number().int().min(0).max(50),
});

/**
 * Outil de discernement in-chat (P5) : le Compagnon IA POSE une question curee.
 *
 * Le client choisit le module + l'index (il porte l'avancement). On resout le
 * texte en i18n dans la langue de l'utilisateur, on le persiste comme un message
 * DU COMPAGNON (chiffre, senderId = l'IA), et on le renvoie pour affichage
 * immediat. L'utilisateur repond ensuite dans la saisie normale ; le Compagnon
 * REAGIT via l'auto-reply LLM existant (route messages). Reserve aux fils avec
 * un Compagnon IA. Aucune table : la question est un simple Message.
 */
export const POST = withErrors(
  async (req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
    const rl = await rateLimit(
      `tool:${user.id}`,
      LIMITS.message.limit,
      LIMITS.message.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const match = await requireMatchMember(params.matchId, user.id);
    const otherId = match.userAId === user.id ? match.userBId : match.userAId;

    const otherUser = await prisma.user.findUnique({
      where: { id: otherId },
      select: { kind: true },
    });
    // Outil reserve aux Compagnons IA : sinon on ne fabrique pas de faux message.
    if (otherUser?.kind !== "AI_COMPANION") {
      return jsonError(403, "NOT_A_COMPANION");
    }

    const { module, index } = schema.parse(await readJsonLimited(req));
    if (!isDiscernmentModule(module) || index >= DISCERNMENT_COUNT[module]) {
      return jsonError(400, "INVALID_TOOL");
    }

    const locale = user.locale ?? "fr";
    const tr = await getTranslations({
      locale,
      namespace: "discovery_ecosystem",
    });
    const question = tr(`discernment.${module}.q${index + 1}`);

    const message = await prisma.message.create({
      data: {
        matchId: match.id,
        senderId: otherId,
        contentEncrypted: encryptField(question),
      },
    });
    await prisma.match.update({
      where: { id: match.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(
      {
        message: {
          id: message.id,
          content: question,
          createdAt: message.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  },
);
