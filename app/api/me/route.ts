import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { hashPassword } from "@/lib/security/password";
import { decryptOptional } from "@/lib/security/crypto";
import { photoProxyUrl } from "@/lib/storage";
import { SESSION_COOKIE } from "@/lib/security/jwt";

export const GET = withErrors(async () => {
  const user = await requireUser();
  // DTO curé : on ne renvoie JAMAIS au client les secrets/jetons du compte.
  const {
    passwordHash: _ph,
    emailVerifyToken: _evt,
    passwordResetToken: _prt,
    passwordResetExpires: _pre,
    emailVerifyExpires: _eve,
    stripeCustomerId: _sci,
    ...safe
  } = user;
  void _ph;
  void _evt;
  void _prt;
  void _pre;
  void _eve;
  void _sci;
  return NextResponse.json({
    ...safe,
    photoUrl: photoProxyUrl(user.photoUrl),
    faithProfile: user.faithProfile && {
      ...user.faithProfile,
      localChurch: decryptOptional(user.faithProfile.localChurchEncrypted),
      testimony: decryptOptional(user.faithProfile.testimonyEncrypted),
      localChurchEncrypted: undefined,
      testimonyEncrypted: undefined,
    },
    relationshipProfile: user.relationshipProfile && {
      ...user.relationshipProfile,
      familyVision: decryptOptional(
        user.relationshipProfile.familyVisionEncrypted,
      ),
      familyVisionEncrypted: undefined,
    },
  });
});

const patchSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  cityApprox: z.string().max(80).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  photoBlurredByDefault: z.boolean().optional(),
  locale: z.enum(["fr", "en", "es", "pt"]).optional(),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = patchSchema.parse(await readJsonLimited(req));
  await prisma.user.update({ where: { id: user.id }, data: body });
  return NextResponse.json({ ok: true });
});

// RGPD (art.17) - effacement par ANONYMISATION : on purge toutes les données
// personnelles et sensibles, mais on conserve le User anonymisé afin de ne PAS
// détruire le Match et la conversation du partenaire (données de tiers). Le
// compte devient inutilisable (mot de passe aléatoire, session invalidée) et
// invisible (exclu du matching, deletedAt posé).
export const DELETE = withErrors(async () => {
  const user = await requireUser();
  const anonHash = await hashPassword(randomBytes(24).toString("hex"));
  await prisma.$transaction([
    prisma.faithProfile.deleteMany({ where: { userId: user.id } }),
    prisma.relationshipProfile.deleteMany({ where: { userId: user.id } }),
    prisma.consent.deleteMany({ where: { userId: user.id } }),
    prisma.booking.deleteMany({ where: { userId: user.id } }),
    prisma.aiCoachUsage.deleteMany({ where: { userId: user.id } }),
    prisma.agentInsight.deleteMany({ where: { userId: user.id } }),
    prisma.report.deleteMany({ where: { reporterId: user.id } }),
    prisma.pushSubscription.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: `deleted-${user.id}@deleted.invalid`,
        displayName: "Membre retiré",
        passwordHash: anonHash,
        photoUrl: null,
        cityApprox: null,
        country: null,
        isVerified: false,
        emailVerifyToken: null,
      },
    }),
  ]);
  const res = NextResponse.json({ ok: true, deleted: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
});
