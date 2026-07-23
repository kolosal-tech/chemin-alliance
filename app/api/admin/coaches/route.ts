import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";
import { auditAdmin } from "@/lib/audit";

// Gestion des accompagnateurs humains (pasteur, prêtre, mentor de couple,
// conseiller) - réservée à l'administration. Utilise les champs existants
// du modèle Coach (aucune migration). L'affiliation porte le rôle clérical.
export const GET = withErrors(async () => {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    auditAdmin({
      event: "admin.coaches.read",
      action: "list",
      result: "denied",
      actorId: "anonymous-admin-api",
      targetId: "collection:coaches",
    });
    throw error;
  }

  try {
    const coaches = await prisma.coach.findMany({
      orderBy: { displayName: "asc" },
    });
    auditAdmin({
      event: "admin.coaches.read",
      action: "list",
      result: "success",
      actorId: admin.id,
      targetId: "collection:coaches",
    });
    return NextResponse.json(coaches);
  } catch (error) {
    auditAdmin({
      event: "admin.coaches.read",
      action: "list",
      result: "failure",
      actorId: admin.id,
      targetId: "collection:coaches",
    });
    throw error;
  }
});

const createSchema = z.object({
  displayName: z.string().min(2).max(80),
  affiliation: z.string().min(2).max(120),
  bio: z.string().max(600).optional(),
  photoUrl: z.string().url().max(500).optional().or(z.literal("")),
  certified: z.boolean().default(false),
  specialties: z.array(z.string().min(1).max(40)).max(8).default([]),
  pricePerSessionEUR: z.number().int().min(0).max(100000),
});

export const POST = withErrors(async (req: Request) => {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    auditAdmin({
      event: "admin.coach.mutate",
      action: "create",
      result: "denied",
      actorId: "anonymous-admin-api",
      targetId: "coach:new",
    });
    throw error;
  }

  try {
    const body = createSchema.parse(await readJsonLimited(req));
    const coach = await prisma.coach.create({
      data: {
        displayName: body.displayName,
        affiliation: body.affiliation,
        bio: body.bio || null,
        photoUrl: body.photoUrl || null,
        certified: body.certified,
        specialties: body.specialties,
        pricePerSessionEUR: body.pricePerSessionEUR,
      },
    });
    auditAdmin({
      event: "admin.coach.mutate",
      action: "create",
      result: "success",
      actorId: admin.id,
      targetId: coach.id,
    });
    return NextResponse.json({ ok: true, coach }, { status: 201 });
  } catch (error) {
    auditAdmin({
      event: "admin.coach.mutate",
      action: "create",
      result: "failure",
      actorId: admin.id,
      targetId: "coach:new",
    });
    throw error;
  }
});
