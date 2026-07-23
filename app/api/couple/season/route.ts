import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import {
  CoupleSpaceError,
  requestCoupleSeasonChange,
} from "@/lib/couple-space";

const schema = z.object({ season: z.enum(["MARRIED", "PARENTS"]) });

/** Bascule de saison (ex. « un enfant est arrivé ») - pour les deux membres. */
export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const { season } = schema.parse(await readJsonLimited(req));
  try {
    const result = await requestCoupleSeasonChange(user.id, season);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CoupleSpaceError) {
      return jsonError(error.status, error.code);
    }
    throw error;
  }
});
