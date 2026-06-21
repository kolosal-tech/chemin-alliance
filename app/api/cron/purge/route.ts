import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireCronAuth } from "@/lib/cron/auth";
import { buildPurgePlan } from "@/lib/cron/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron quotidien : purge idempotente des données expirées - vérifications
// téléphone expirées, tokens email/MDP expirés (nullifiés), compteurs Coach IA
// > 90 j. Rejouable sans danger. Dormant : 503 sans CRON_SECRET.
// NB : les Match PENDING dormants ne sont PAS purgés (peuvent contenir des
// données de tiers ; à activer seulement sur règle métier validée).
export const GET = withErrors(async (req: Request) => {
  requireCronAuth(req);
  const plan = buildPurgePlan(new Date());

  const [phone, emailTok, pwdTok, aiCoach] = await prisma.$transaction([
    prisma.phoneVerification.deleteMany({
      where: { expiresAt: { lt: plan.phoneBefore } },
    }),
    prisma.user.updateMany({
      where: { isVerified: true, emailVerifyExpires: { lt: plan.tokenBefore } },
      data: { emailVerifyToken: null, emailVerifyExpires: null },
    }),
    prisma.user.updateMany({
      where: { passwordResetExpires: { lt: plan.tokenBefore } },
      data: { passwordResetToken: null, passwordResetExpires: null },
    }),
    prisma.aiCoachUsage.deleteMany({
      where: { day: { lt: plan.aiCoachBefore } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    purged: {
      phoneVerifications: phone.count,
      emailTokens: emailTok.count,
      passwordResetTokens: pwdTok.count,
      aiCoachUsage: aiCoach.count,
    },
  });
});
