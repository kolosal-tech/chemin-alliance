import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember, buildActionContext } from "@/lib/alliance";
import { decryptOptional, encryptField } from "@/lib/security/crypto";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { validateAction, type Locale } from "@/lib/core-engine";
import {
  detectContactLeak,
  leakKindsToActions,
} from "@/lib/moderation/contact-detection";
import { analyzeRisk } from "@/lib/agents/watchman";

export const GET = withErrors(
  async (_req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const match = await requireMatchMember(params.matchId, user.id);
    const messages = await prisma.message.findMany({
      where: { matchId: match.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return NextResponse.json(
      messages
        // un message bloqué n'est visible que par son expéditeur
        .filter((m) => m.moderationStatus !== "BLOCKED" || m.senderId === user.id)
        .map((m) => ({
          id: m.id,
          senderId: m.senderId,
          kind: m.kind,
          mine: m.senderId === user.id,
          content: decryptOptional(m.contentEncrypted) ?? "",
          moderationStatus: m.moderationStatus,
          blockedReason: m.senderId === user.id ? m.blockedReason : null,
          createdAt: m.createdAt,
        })),
    );
  },
);

const schema = z.object({ content: z.string().min(1).max(4000) });

/**
 * Envoi d'un message :
 * 1. validateAction(send_message) — la doctrine gouverne, pas l'UI.
 * 2. detectContactLeak — si coordonnées détectées, validateAction par type.
 *    Non autorisé -> message stocké BLOCKED (visible expéditeur seul) +
 *    message SYSTÈME éducatif (texte du moteur, jamais une erreur technique).
 */
export const POST = withErrors(
  async (req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const rl = rateLimit(
      `msg:${user.id}`,
      LIMITS.message.limit,
      LIMITS.message.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const match = await requireMatchMember(params.matchId, user.id);
    const { content } = schema.parse(await req.json());
    const locale = (user.locale ?? "fr") as Locale;
    const ctx = await buildActionContext(match, user.id, user.rulesetId, locale);

    const canSend = validateAction({
      rulesetId: user.rulesetId,
      stage: match.stage,
      action: "send_message",
      context: ctx,
    });
    if (!canSend.allowed) {
      return jsonError(403, canSend.reasonCode, canSend.userMessage);
    }

    const leak = detectContactLeak(content);
    if (leak.detected) {
      const verdicts = leakKindsToActions(leak.kinds).map((action) =>
        validateAction({
          rulesetId: user.rulesetId,
          stage: match.stage,
          action,
          context: ctx,
        }),
      );
      const denied = verdicts.find((v) => !v.allowed);
      if (denied) {
        const [blocked, system] = await prisma.$transaction([
          prisma.message.create({
            data: {
              matchId: match.id,
              senderId: user.id,
              contentEncrypted: encryptField(content),
              moderationStatus: "BLOCKED",
              blockedReason: denied.reasonCode,
            },
          }),
          prisma.message.create({
            data: {
              matchId: match.id,
              senderId: user.id,
              kind: "SYSTEM",
              contentEncrypted: encryptField(denied.userMessage),
            },
          }),
        ]);
        return NextResponse.json({
          blocked: true,
          reasonCode: denied.reasonCode,
          systemMessage: denied.userMessage,
          messageId: blocked.id,
          systemMessageId: system.id,
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        matchId: match.id,
        senderId: user.id,
        contentEncrypted: encryptField(content),
      },
    });
    // Agent Veilleur : signaux de risque -> dossier modération humaine.
    // Jamais bloquant, jamais visible par les membres.
    const risk = analyzeRisk(content);
    if (risk.flagged) {
      await prisma.agentInsight.create({
        data: {
          userId: user.id,
          matchId: match.id,
          agentId: "watchman",
          kind: "SAFETY_SIGNAL",
          dataJson: { signals: risk.signals, excerpt: content.slice(0, 160) },
          visibility: "COACH_ONLY",
        },
      });
    }
    await prisma.match.update({
      where: { id: match.id },
      data: { updatedAt: new Date() },
    });
    return NextResponse.json(
      { blocked: false, messageId: message.id },
      { status: 201 },
    );
  },
);
