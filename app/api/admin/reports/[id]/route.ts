import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";
import { auditAdmin, type AdminAuditResult } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["REVIEWING", "RESOLVED", "DISMISSED", "BAN"]),
});

export const PATCH = withErrors(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    let admin;
    try {
      admin = await requireAdmin();
    } catch (error) {
      auditAdmin({
        event: "admin.report.mutate",
        action: "request",
        result: "denied",
        actorId: "anonymous-admin-api",
        targetId: id,
      });
      throw error;
    }

    let action: "request" | "reviewing" | "resolved" | "dismissed" | "ban" =
      "request";
    let result: AdminAuditResult = "failure";
    let auditTargetId = id;

    try {
      const body = schema.parse(await readJsonLimited(req));
      action = body.action.toLowerCase() as typeof action;

      if (body.action === "BAN") {
        const report = await prisma.report.findUnique({
          where: { id },
          select: { targetUserId: true },
        });
        if (!report) {
          result = "not_found";
          return NextResponse.json(
            { ok: false, error: "NOT_FOUND" },
            { status: 404 },
          );
        }
        auditTargetId = report.targetUserId;
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
        result = "success";
        return NextResponse.json({ ok: true, banned: true });
      }

      await prisma.report.update({
        where: { id },
        data: {
          status: body.action,
          resolvedAt: body.action === "REVIEWING" ? null : new Date(),
        },
      });
      result = "success";
      return NextResponse.json({ ok: true });
    } finally {
      auditAdmin({
        event: "admin.report.mutate",
        action,
        result,
        actorId: admin.id,
        targetId: auditTargetId,
      });
    }
  },
);
