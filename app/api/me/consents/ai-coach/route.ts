import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import {
  AiCoachConsentSupersededError,
  aiCoachConsentDto,
  getActiveAiCoachConsent,
  grantAiCoachConsent,
  revokeAiCoachConsent,
} from "@/lib/ai-coach/consent";

export const GET = withErrors(async () => {
  const user = await requireUser();
  const consent = await getActiveAiCoachConsent(user.id);
  return NextResponse.json(aiCoachConsentDto(consent), {
    headers: { "cache-control": "private, no-store, max-age=0" },
  });
});

/**
 * Le corps est volontairement vide : consentir n'envoie ni question, ni
 * historique, ni profil à un fournisseur. Le périmètre vient du serveur.
 */
export const POST = withErrors(async () => {
  const user = await requireUser();
  if (!user.isVerified) return jsonError(403, "EMAIL_NOT_VERIFIED");
  let consent;
  try {
    consent = await grantAiCoachConsent(user.id);
  } catch (error) {
    if (error instanceof AiCoachConsentSupersededError) {
      return jsonError(409, "AI_COACH_CONSENT_OPERATION_SUPERSEDED");
    }
    throw error;
  }
  return NextResponse.json(aiCoachConsentDto(consent), {
    headers: { "cache-control": "private, no-store, max-age=0" },
  });
});

/** Le retrait reste disponible sans suppression du compte. */
export const DELETE = withErrors(async () => {
  const user = await requireUser();
  await revokeAiCoachConsent(user.id);
  return NextResponse.json(
    { ok: true, active: false },
    { headers: { "cache-control": "private, no-store, max-age=0" } },
  );
});
