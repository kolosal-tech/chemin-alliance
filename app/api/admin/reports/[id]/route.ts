import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";

const schema = z.object({
  status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]),
});

export const PATCH = withErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    await requireAdmin();
    const body = schema.parse(await readJsonLimited(req));
    await prisma.report.update({
      where: { id: params.id },
      data: {
        status: body.status,
        resolvedAt: body.status === "REVIEWING" ? null : new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  },
);
