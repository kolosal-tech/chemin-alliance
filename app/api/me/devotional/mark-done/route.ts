import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { advanceStreak } from "@/lib/devotional";

// Marque le dévotionnel du jour comme fait et fait avancer le streak (jour UTC).
// Idempotent ; relecture+écriture en transaction (anti-race).
export const POST = withErrors(async () => {
  const user = await requireUser();
  const rl = await rateLimit(
    `devotional:${user.id}`,
    LIMITS.devotional.limit,
    LIMITS.devotional.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const r = await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        lastDevotionDate: true,
        currentStreak: true,
        longestStreak: true,
      },
    });
    const res = advanceStreak(
      u.lastDevotionDate,
      new Date(),
      u.currentStreak,
      u.longestStreak,
    );
    if (!res.alreadyDoneToday) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastDevotionDate: res.lastDevotionDate,
          currentStreak: res.currentStreak,
          longestStreak: res.longestStreak,
        },
      });
    }
    return res;
  });

  return NextResponse.json({
    currentStreak: r.currentStreak,
    longestStreak: r.longestStreak,
    alreadyDoneToday: r.alreadyDoneToday,
    isNewRecord: r.isNewRecord,
  });
});
