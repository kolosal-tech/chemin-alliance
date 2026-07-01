import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

const schema = z.object({ slotStart: z.string().datetime() });

export const POST = withErrors(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const { slotStart } = schema.parse(await readJsonLimited(req));
    const coach = await prisma.coach.findUnique({ where: { id } });
    if (!coach) return jsonError(404, "NOT_FOUND");

    try {
      const booking = await prisma.booking.create({
        data: {
          coachId: coach.id,
          userId: user.id,
          slotStart: new Date(slotStart),
        },
      });
      return NextResponse.json(
        { ok: true, bookingId: booking.id },
        { status: 201 },
      );
    } catch (err) {
      // 409 UNIQUEMENT pour la violation d'unicité (slot déjà réservé).
      // Toute autre erreur (panne DB, etc.) doit remonter en 500, pas être
      // masquée en "créneau pris".
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return jsonError(409, "SLOT_TAKEN");
      }
      throw err;
    }
  },
);
