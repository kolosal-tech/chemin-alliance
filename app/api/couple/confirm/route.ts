import { NextResponse } from "next/server";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { confirmMatchCoupleSpace, CoupleSpaceError } from "@/lib/couple-space";

/** Confirmation du mariage par le second membre (espace issu d'un match). */
export const POST = withErrors(async () => {
  const user = await requireUser();
  try {
    const result = await confirmMatchCoupleSpace(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CoupleSpaceError) {
      return jsonError(error.status, error.code);
    }
    throw error;
  }
});
