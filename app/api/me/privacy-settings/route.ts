import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { privacySettingsPatchSchema } from "@/lib/privacy-settings";

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = privacySettingsPatchSchema.parse(await readJsonLimited(req));
  await prisma.privacySettings.update({
    where: { userId: user.id },
    data: body,
  });
  return NextResponse.json({ ok: true });
});
