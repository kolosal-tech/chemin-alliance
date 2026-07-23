import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";
import { auditAdmin } from "@/lib/audit";

// Retrait d'un accompagnateur humain (admin uniquement).
export const DELETE = withErrors(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    let admin;
    try {
      admin = await requireAdmin();
    } catch (error) {
      auditAdmin({
        event: "admin.coach.mutate",
        action: "delete",
        result: "denied",
        actorId: "anonymous-admin-api",
        targetId: id,
      });
      throw error;
    }

    try {
      await prisma.coach.delete({ where: { id } });
      auditAdmin({
        event: "admin.coach.mutate",
        action: "delete",
        result: "success",
        actorId: admin.id,
        targetId: id,
      });
      return NextResponse.json({ ok: true, deleted: true });
    } catch (error) {
      auditAdmin({
        event: "admin.coach.mutate",
        action: "delete",
        result: "failure",
        actorId: admin.id,
        targetId: id,
      });
      throw error;
    }
  },
);
