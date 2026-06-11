import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { consolationWord, REBUILDING_STEPS } from "@/lib/agents/rebuilding";
import type { Locale } from "@/lib/core-engine";

export const GET = withErrors(async () => {
  const user = await requireUser();
  const locale = (user.locale ?? "fr") as Locale;
  const word = await consolationWord(locale);
  return NextResponse.json({ steps: REBUILDING_STEPS[locale], word });
});
