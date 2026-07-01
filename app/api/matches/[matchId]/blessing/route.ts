import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { generateBlessingToken } from "@/lib/sponsor";
import { sendBlessingRequestEmail } from "@/lib/email";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/core-engine";

export const runtime = "nodejs";

// L'utilisateur (filleul·e) demande la bénédiction de son Parrain/Marraine
// avant d'avancer dans une mise en relation. Garde : membre du match + parrain
// désigné. Email avec lien magique. Non bloquant (advisory).
export const POST = withErrors(
  async (
    req: Request,
    { params }: { params: Promise<{ matchId: string }> },
  ) => {
    const user = await requireUser();
    const rl = await rateLimit(
      `blessing:${user.id}`,
      LIMITS.invite.limit,
      LIMITS.invite.windowMs,
    );
    if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

    const { matchId } = await params;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
      return jsonError(404, "NOT_FOUND");
    }

    const sponsor = await prisma.sponsor.findUnique({
      where: { userId: user.id },
    });
    if (!sponsor) return jsonError(409, "NO_SPONSOR");

    // Dédup anti-spam : réutilise une demande PENDING existante pour ce match.
    let blessing = await prisma.blessing.findFirst({
      where: { userId: user.id, matchId: match.id, status: "PENDING" },
    });
    if (!blessing) {
      blessing = await prisma.blessing.create({
        data: {
          sponsorId: sponsor.id,
          matchId: match.id,
          userId: user.id,
          token: generateBlessingToken(),
        },
      });
    }

    const locale = (user.locale ?? "fr") as Locale;
    const link = `${env.APP_URL}/${locale}/parrain/${blessing.token}`;
    await sendBlessingRequestEmail(
      sponsor.email,
      sponsor.name,
      user.displayName,
      link,
      locale,
    );

    return NextResponse.json({ ok: true });
  },
);
