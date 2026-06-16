import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { env } from "@/lib/env";

export const GET = withErrors(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return jsonError(400, "TOKEN_REQUIRED");

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
  });
  if (!user) return jsonError(400, "TOKEN_INVALID");
  if (user.emailVerifyExpires && user.emailVerifyExpires.getTime() < Date.now()) {
    return jsonError(400, "TOKEN_EXPIRED");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
  });

  return NextResponse.redirect(`${env.APP_URL}/${user.locale}/login?verified=1`);
});
