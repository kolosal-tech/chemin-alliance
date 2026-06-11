import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { decryptOptional } from "@/lib/security/crypto";
import { SESSION_COOKIE } from "@/lib/security/jwt";

export const GET = withErrors(async () => {
  const user = await requireUser();
  const { passwordHash: _ph, emailVerifyToken: _evt, ...safe } = user;
  void _ph;
  void _evt;
  return NextResponse.json({
    ...safe,
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
  photoBlurredByDefault: z.boolean().optional(),
  locale: z.enum(["fr", "en", "es", "pt"]).optional(),
});

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = patchSchema.parse(await req.json());
  await prisma.user.update({ where: { id: user.id }, data: body });
  return NextResponse.json({ ok: true });
});

// RGPD : suppression réelle, cascade Prisma (profils, messages, matchs…)
export const DELETE = withErrors(async () => {
  const user = await requireUser();
  await prisma.user.delete({ where: { id: user.id } });
  const res = NextResponse.json({ ok: true, deleted: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
});
