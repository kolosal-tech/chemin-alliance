import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireAuthenticatedUser, requireUser } from "@/lib/security/session";
import { hashPassword } from "@/lib/security/password";
import { decryptOptional } from "@/lib/security/crypto";
import { deleteProfilePhotoObjects, photoProxyUrl } from "@/lib/storage";
import { SESSION_COOKIE } from "@/lib/security/jwt";
import { eraseAccountData } from "@/lib/account-deletion";
import { eraseLinkedStripeCustomer } from "@/lib/payments/stripe-erasure";

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

// RGPD (art.17) - effacement immédiat des données propres au membre et
// pseudonymisation de la ligne User nécessaire à la préservation des données
// appartenant à des tiers. Stripe puis le stockage objet sont purgés AVANT la
// pseudonymisation : aucun succès fictif si une donnée externe reste liée.
export const DELETE = withErrors(async () => {
  const user = await requireAuthenticatedUser();
  try {
    // Stripe en premier : la suppression du Customer annule les abonnements.
    // Un retry reste sûr si une étape locale échoue ensuite.
    await eraseLinkedStripeCustomer(user.stripeCustomerId);
  } catch (err) {
    console.error(
      "[account-deletion] suppression Stripe incomplète",
      err instanceof Error ? err.name : "UnknownError",
    );
    return jsonError(502, "ACCOUNT_DELETION_INCOMPLETE");
  }
  if (!(await deleteProfilePhotoObjects(user.photoUrl))) {
    return jsonError(502, "ACCOUNT_DELETION_INCOMPLETE");
  }
  const anonHash = await hashPassword(randomBytes(24).toString("hex"));
  await eraseAccountData(user.id, anonHash);
  const res = NextResponse.json({ ok: true, deleted: true });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
});
