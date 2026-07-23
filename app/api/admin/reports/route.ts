import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";
import { auditAdmin } from "@/lib/audit";

export const GET = withErrors(async () => {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    auditAdmin({
      event: "admin.reports.read",
      action: "list",
      result: "denied",
      actorId: "anonymous-admin-api",
      targetId: "collection:reports",
    });
    throw error;
  }

  try {
    const reports = await prisma.report.findMany({
      where: { status: { in: ["OPEN", "REVIEWING"] } },
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { displayName: true } },
        target: { select: { displayName: true } },
      },
    });
    auditAdmin({
      event: "admin.reports.read",
      action: "list",
      result: "success",
      actorId: admin.id,
      targetId: "collection:reports",
    });
    return NextResponse.json(reports);
  } catch (error) {
    auditAdmin({
      event: "admin.reports.read",
      action: "list",
      result: "failure",
      actorId: admin.id,
      targetId: "collection:reports",
    });
    throw error;
  }
});
