import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { requireMatchMember, buildActionContext } from "@/lib/alliance";
import { validateAction, type Locale } from "@/lib/core-engine";

/** Demande officielle d'échange — gouvernée par le moteur doctrinal. */
export const POST = withErrors(
  async (req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const match = await requireMatchMember(params.matchId, user.id);
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
    await prisma.match.update({
      where: { id: match.id },
      data: { contactExchange: "REQUESTED" },
    });
    return NextResponse.json({ allowed: true, status: "REQUESTED" });
  },
);

const respondSchema = z.object({ accept: z.boolean() });

export const PATCH = withErrors(
  async (req: Request, { params }: { params: { matchId: string } }) => {
    const user = await requireUser();
    const match = await requireMatchMember(params.matchId, user.id);
    if (match.contactExchange !== "REQUESTED") {
      return jsonError(409, "NO_PENDING_REQUEST");
    }
    const { accept } = respondSchema.parse(await req.json());
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { contactExchange: accept ? "ACCEPTED" : "DECLINED" },
    });
    return NextResponse.json({ ok: true, status: updated.contactExchange });
  },
);
