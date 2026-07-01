import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import {
  requireMatchMember,
  buildActionContext,
  nextStage,
} from "@/lib/alliance";
import { validateAction, type Locale } from "@/lib/core-engine";

/**
 * Avancement à double consentement :
 * 1er appelant -> advanceRequestedBy = lui.
 * 2e appelant (l'autre) -> required_checks via moteur, puis transition.
 */
export const POST = withErrors(
  async (
    _req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const match = await requireMatchMember((await params).matchId, user.id);
    const target = nextStage(match.stage);
    if (!target) return jsonError(409, "NO_NEXT_STAGE");

    if (!match.advanceRequestedBy) {
      await prisma.match.update({
        where: { id: match.id },
        data: { advanceRequestedBy: user.id },
      });
      return NextResponse.json({ advanced: false, pendingOther: true });
    }
    if (match.advanceRequestedBy === user.id) {
      return NextResponse.json({ advanced: false, pendingOther: true });
    }

    const ctx = await buildActionContext(
      match,
      user.id,
      user.rulesetId,
      (user.locale ?? "fr") as Locale,
    );
    const verdict = validateAction({
      rulesetId: user.rulesetId,
      stage: match.stage,
      action: "advance_stage",
      context: ctx,
    });
    if (!verdict.allowed) {
      return NextResponse.json(
        {
          advanced: false,
          reasonCode: verdict.reasonCode,
          userMessage: verdict.userMessage,
          requiredNextSteps: verdict.requiredNextSteps,
        },
        { status: 403 },
      );
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { stage: target, advanceRequestedBy: null },
    });
    return NextResponse.json({ advanced: true, stage: target });
  },
);
