import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export class ReportTargetUnavailableError extends Error {
  readonly status = 404;

  constructor() {
    super("REPORT_TARGET_UNAVAILABLE");
    this.name = "ReportTargetUnavailableError";
  }
}

/**
 * Crée un signalement uniquement lorsqu'une interaction entre les deux comptes
 * existe réellement. Le statut du match n'est volontairement pas filtré :
 * une personne doit encore pouvoir signaler après avoir refusé, fermé ou
 * bloqué une relation.
 *
 * La transaction SERIALIZABLE rend la déduplication OPEN/REVIEWING atomique.
 * Un conflit de sérialisation est rejoué avec un nombre de tentatives borné.
 */
export async function createContextualReport(
  reporterId: string,
  targetUserId: string,
  reason: string,
): Promise<{ created: boolean }> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const sharedMatch = await tx.match.findFirst({
            where: {
              OR: [
                { userAId: reporterId, userBId: targetUserId },
                { userAId: targetUserId, userBId: reporterId },
              ],
            },
            select: { id: true },
          });
          if (!sharedMatch) throw new ReportTargetUnavailableError();

          const existing = await tx.report.findFirst({
            where: {
              reporterId,
              targetUserId,
              status: { in: ["OPEN", "REVIEWING"] },
            },
            select: { id: true },
          });
          if (existing) return { created: false };

          await tx.report.create({
            data: { reporterId, targetUserId, reason },
            select: { id: true },
          });
          return { created: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof ReportTargetUnavailableError) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maxAttempts
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("REPORT_CREATE_RETRY_EXHAUSTED");
}
