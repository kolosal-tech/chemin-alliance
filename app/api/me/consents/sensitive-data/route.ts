import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-helpers";
import { requireAuthenticatedUser } from "@/lib/security/session";
import {
  getSensitiveDataConsentState,
  grantSensitiveDataConsent,
  revokeSensitiveDataConsent,
  SensitiveDataConsentSupersededError,
} from "@/lib/sensitive-data-consent";

export const GET = withErrors(async () => {
  const user = await requireAuthenticatedUser();
  return NextResponse.json(await getSensitiveDataConsentState(user.id), {
    headers: { "cache-control": "private, no-store, max-age=0" },
  });
});

export const POST = withErrors(async () => {
  const user = await requireAuthenticatedUser();
  let consent;
  try {
    consent = await grantSensitiveDataConsent(user.id);
  } catch (error) {
    if (error instanceof SensitiveDataConsentSupersededError) {
      return NextResponse.json(
        { error: "SENSITIVE_DATA_CONSENT_OPERATION_SUPERSEDED" },
        {
          status: 409,
          headers: { "cache-control": "private, no-store, max-age=0" },
        },
      );
    }
    throw error;
  }
  return NextResponse.json(
    {
      active: true,
      grantedAt: consent.grantedAt,
      version: consent.version,
    },
    {
      headers: { "cache-control": "private, no-store, max-age=0" },
    },
  );
});

export const DELETE = withErrors(async () => {
  const user = await requireAuthenticatedUser();
  const revokedAt = await revokeSensitiveDataConsent(user.id);
  return NextResponse.json(
    { active: false, revokedAt },
    { headers: { "cache-control": "private, no-store, max-age=0" } },
  );
});
