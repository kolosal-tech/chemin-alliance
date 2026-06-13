import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";

// Retrait d'un accompagnateur humain (admin uniquement).
export const DELETE = withErrors(
  async (_req: Request, { params }: { params: { id: string } }) => {
    await requireAdmin();
    await prisma.coach.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, deleted: true });
  },
);
