import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/security/session";

// Gestion des accompagnateurs humains (pasteur, prêtre, mentor de couple,
// conseiller) — réservée à l'administration. Utilise les champs existants
// du modèle Coach (aucune migration). L'affiliation porte le rôle clérical.
export const GET = withErrors(async () => {
  await requireAdmin();
  const coaches = await prisma.coach.findMany({
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json(coaches);
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
  await requireAdmin();
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
  return NextResponse.json({ ok: true, coach }, { status: 201 });
});
