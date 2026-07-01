import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";

const schema = z.object({
  action: z.enum(["REVIEWING", "RESOLVED", "DISMISSED", "BAN"]),
});

export const PATCH = withErrors(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin();
    const { id } = await params;
    const body = schema.parse(await readJsonLimited(req));

    if (body.action === "BAN") {
      const report = await prisma.report.findUnique({
        where: { id },
        select: { targetUserId: true },
      });
      if (!report) {
        return NextResponse.json(
          { ok: false, error: "NOT_FOUND" },
          { status: 404 },
        );
      }
      await prisma.$transaction([
        prisma.user.update({
          where: { id: report.targetUserId },
          data: { deletedAt: new Date() },
        }),
        prisma.report.update({
          where: { id },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ ok: true, banned: true });
    }

    await prisma.report.update({
      where: { id },
      data: {
        status: body.action,
        resolvedAt: body.action === "REVIEWING" ? null : new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  },
);
