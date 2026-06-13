import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, jsonError, withErrors } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/security/password";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(12).max(128),
  displayName: z.string().min(2).max(40),
  age: z.number().int().min(18).max(99),
  vertical: z.enum(["CHRISTIAN_EVANGELICAL", "CHRISTIAN_CATHOLIC"]),
  country: z.string().max(80).optional(),
  locale: z.enum(["fr", "en", "es", "pt"]).default("fr"),
  consentSensitiveData: z.literal(true),
  consentTerms: z.literal(true),
});

export const POST = withErrors(async (req: Request) => {
  const rl = rateLimit(`register:${clientIp(req)}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const body = schema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return jsonError(409, "EMAIL_TAKEN");

  const token = randomBytes(32).toString("hex");
  const rulesetId =
    body.vertical === "CHRISTIAN_CATHOLIC"
      ? "christian_catholic_default"
      : "christian_evangelical_default";

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      displayName: body.displayName,
      age: body.age,
      country: body.country || null,
      locale: body.locale,
      rulesetId,
      emailVerifyToken: token,
      faithProfile: { create: { vertical: body.vertical } },
      relationshipProfile: { create: { maritalStatus: "single" } },
      privacySettings: { create: {} },
      consents: {
        createMany: {
          data: [
            { type: "SENSITIVE_DATA_PROCESSING" },
            { type: "TERMS_OF_SERVICE" },
          ],
        },
      },
    },
    select: { id: true, email: true },
  });

  await sendVerificationEmail(user.email, token, body.locale);
  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
});
