import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";

export const GET = withErrors(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const coach = await prisma.coach.findUnique({ where: { id: params.id } });
    if (!coach) return jsonError(404, "NOT_FOUND");
    return NextResponse.json(coach);
  },
);
