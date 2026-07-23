import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireActiveMatchMember, buildActionContext } from "@/lib/alliance";
import { validateAction, type Locale } from "@/lib/core-engine";
import {
  canRespondToContactExchange,
  CONTACT_REQUESTABLE_STATUSES,
} from "@/lib/contact-exchange";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

/** Demande officielle d'échange - gouvernée par le moteur doctrinal. */
export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireActiveMatchMember(
      (await params).matchId,
      user.id,
    );
    const rl = await rateLimit(
      `contact-exchange:${match.id}:${user.id}`,
      LIMITS.invite.limit,
      LIMITS.invite.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
    const ctx = await buildActionContext(
      match,
      user.id,
      user.rulesetId,
      (user.locale ?? "fr") as Locale,
    );
    const verdict = validateAction({
      rulesetId: user.rulesetId,
      stage: match.stage,
      action: "request_contact_exchange",
      context: ctx,
    });
    if (!verdict.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reasonCode: verdict.reasonCode,
          userMessage: verdict.userMessage,
          requiredNextSteps: verdict.requiredNextSteps,
        },
        { status: 403 },
      );
    }
    const updated = await prisma.match.updateMany({
      where: {
        id: match.id,
        status: "ACTIVE",
        contactExchange: { in: [...CONTACT_REQUESTABLE_STATUSES] },
      },
      data: {
        contactExchange: "REQUESTED",
        contactExchangeRequestedBy: user.id,
      },
    });
    if (updated.count !== 1) {
      return jsonError(409, "CONTACT_EXCHANGE_UNAVAILABLE");
    }
    return NextResponse.json({ allowed: true, status: "REQUESTED" });
  },
);

const respondSchema = z.object({ accept: z.boolean() });

export const PATCH = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireActiveMatchMember(
      (await params).matchId,
      user.id,
    );
    const rl = await rateLimit(
      `contact-exchange:${match.id}:${user.id}`,
      LIMITS.invite.limit,
      LIMITS.invite.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");
    if (!canRespondToContactExchange(match, user.id)) {
      return jsonError(409, "NO_PENDING_REQUEST");
    }
    const { accept } = respondSchema.parse(await readJsonLimited(req));
    const status = accept ? "ACCEPTED" : "DECLINED";
    const updated = await prisma.match.updateMany({
      where: {
        id: match.id,
        status: "ACTIVE",
        contactExchange: "REQUESTED",
        contactExchangeRequestedBy: match.contactExchangeRequestedBy,
      },
      data: {
        contactExchange: status,
        contactExchangeRequestedBy: null,
      },
    });
    if (updated.count !== 1) {
      return jsonError(409, "NO_PENDING_REQUEST");
    }
    return NextResponse.json({ ok: true, status });
  },
);
