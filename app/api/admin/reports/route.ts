import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";

export const GET = withErrors(async () => {
  await requireAdmin();
  const reports = await prisma.report.findMany({
    where: { status: { in: ["OPEN", "REVIEWING"] } },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { displayName: true } },
      target: { select: { displayName: true } },
    },
  });
  return NextResponse.json(reports);
});
