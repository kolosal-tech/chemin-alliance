import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({ slotStart: z.string().datetime() });

export const POST = withErrors(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();
    const { slotStart } = schema.parse(await req.json());
    const coach = await prisma.coach.findUnique({ where: { id: params.id } });
    if (!coach) return jsonError(404, "NOT_FOUND");

    try {
      const booking = await prisma.booking.create({
        data: {
          coachId: coach.id,
          userId: user.id,
          slotStart: new Date(slotStart),
        },
      });
      return NextResponse.json({ ok: true, bookingId: booking.id }, { status: 201 });
    } catch {
      return jsonError(409, "SLOT_TAKEN");
    }
  },
);
