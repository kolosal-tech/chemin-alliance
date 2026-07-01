import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sealInsight } from "@/lib/agent-insight";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
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
import { isBlockedBetween } from "@/lib/blocks";
import { sendPushToUser } from "@/lib/push";
import { newMessageNotification } from "@/lib/push-messages";
import { generateCompanionReply } from "@/lib/companions/reply";
import { getTranslations } from "next-intl/server";
import type { LlmTurn } from "@/lib/llm/gateway";

// web-push (via lib/push) requiert le runtime Node.
export const runtime = "nodejs";

export const GET = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireMatchMember((await params).matchId, user.id);
    const messages = await prisma.message.findMany({
      where: { matchId: match.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return NextResponse.json(
      messages
        // un message bloqué n'est visible que par son expéditeur
        .filter(
          (m) => m.moderationStatus !== "BLOCKED" || m.senderId === user.id,
        )
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
 * 1. validateAction(send_message) - la doctrine gouverne, pas l'UI.
 * 2. detectContactLeak - si coordonnées détectées, validateAction par type.
 *    Non autorisé -> message stocké BLOCKED (visible expéditeur seul) +
 *    message SYSTÈME éducatif (texte du moteur, jamais une erreur technique).
 */
export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
    const rl = await rateLimit(
      `msg:${user.id}`,
      LIMITS.message.limit,
      LIMITS.message.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const match = await requireMatchMember((await params).matchId, user.id);
    // Blocage (gratuit à vie) : tout échange est coupé dans les deux sens.
    const otherId = match.userAId === user.id ? match.userBId : match.userAId;
    if (await isBlockedBetween(user.id, otherId)) {
      return jsonError(403, "RELATION_BLOCKED");
    }
    // Demande non encore acceptée : seul le demandeur peut envoyer (message
    // d'ouverture). Le destinataire doit d'abord accepter la rencontre.
    if (
      match.status === "PENDING" &&
      match.requestedById &&
      match.requestedById !== user.id
    ) {
      return jsonError(403, "MATCH_PENDING_ACCEPT");
    }
    const { content } = schema.parse(await readJsonLimited(req));
    const locale = (user.locale ?? "fr") as Locale;
    const ctx = await buildActionContext(
      match,
      user.id,
      user.rulesetId,
      locale,
    );

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
          dataJson: sealInsight({
            signals: risk.signals,
            severity: risk.severity,
            excerpt: content.slice(0, 160),
          }),
          visibility: "COACH_ONLY",
        },
      });
    }
    await prisma.match.update({
      where: { id: match.id },
      data: { updatedAt: new Date() },
    });

    // Compagnon IA : le destinataire est un profil d'accompagnement pilote par
    // IA (jamais un humain). On genere une reponse immediate et on la persiste
    // comme un message du compagnon, puis on la renvoie au client pour affichage
    // direct. Aucun push (l'IA n'a pas d'appareil ; l'utilisateur est actif).
    const otherUser = await prisma.user.findUnique({
      where: { id: otherId },
      select: {
        kind: true,
        aiCompanionMeta: { select: { systemPrompt: true, active: true } },
      },
    });
    if (otherUser?.kind === "AI_COMPANION") {
      let companionReply: {
        id: string;
        content: string;
        createdAt: string;
      } | null = null;
      if (otherUser.aiCompanionMeta?.active) {
        // Historique recent (hors message courant + hors bloques), du plus
        // ancien au plus recent, pour la continuite de la conversation.
        const prior = await prisma.message.findMany({
          where: {
            matchId: match.id,
            kind: "USER",
            moderationStatus: { not: "BLOCKED" },
            id: { not: message.id },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { senderId: true, contentEncrypted: true },
        });
        const history: LlmTurn[] = prior
          .reverse()
          .map((h) => ({
            role: (h.senderId === otherId ? "assistant" : "user") as
              | "assistant"
              | "user",
            content: decryptOptional(h.contentEncrypted) ?? "",
          }))
          .filter((h) => h.content.length > 0);

        let replyText = await generateCompanionReply({
          systemPrompt: otherUser.aiCompanionMeta.systemPrompt,
          locale,
          userMessage: content,
          history,
        });
        // Repli localise si tous les modeles echouent : jamais de silence.
        if (!replyText) {
          const tr = await getTranslations({
            locale,
            namespace: "discovery_ecosystem",
          });
          replyText = tr("replyFallback");
        }
        const reply = await prisma.message.create({
          data: {
            matchId: match.id,
            senderId: otherId,
            contentEncrypted: encryptField(replyText),
          },
        });
        await prisma.match.update({
          where: { id: match.id },
          data: { updatedAt: new Date() },
        });
        companionReply = {
          id: reply.id,
          content: replyText,
          createdAt: reply.createdAt.toISOString(),
        };
      }
      return NextResponse.json(
        { blocked: false, messageId: message.id, companionReply },
        { status: 201 },
      );
    }

    // Notification push best-effort au destinataire (jamais bloquant).
    // Le corps ne révèle jamais le contenu (chiffré) : seul l'expéditeur.
    try {
      const recipient = await prisma.user.findUnique({
        where: { id: otherId },
        select: { locale: true },
      });
      await sendPushToUser(
        otherId,
        newMessageNotification(recipient?.locale, match.id),
      );
    } catch (err) {
      console.error("[push] notif message échouée", err);
    }
    return NextResponse.json(
      { blocked: false, messageId: message.id },
      { status: 201 },
    );
  },
);
