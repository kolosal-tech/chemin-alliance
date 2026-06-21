import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, readJsonLimited, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";

// Runtime Node explicite : web-push (via lib/push) utilise crypto/https -
// interdit un runtime edge accidentel.
export const runtime = "nodejs";

// Hôtes des services push légitimes. Le serveur POSTera plus tard vers cet
// endpoint (web-push) : sans cet allowlist, un endpoint interne
// (169.254.169.254, localhost:6379…) deviendrait une cible SSRF.
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];
const B64URL = /^[A-Za-z0-9_-]+$/;

const schema = z.object({
  endpoint: z
    .string()
    .url()
    .max(1024)
    .refine((u) => {
      try {
        const { protocol, hostname } = new URL(u);
        return (
          protocol === "https:" &&
          PUSH_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))
        );
      } catch {
        return false;
      }
    }, "endpoint push non autorisé"),
  keys: z.object({
    p256dh: z.string().min(1).max(255).regex(B64URL),
    auth: z.string().min(1).max(255).regex(B64URL),
  }),
});

// Enregistre (ou met à jour) l'abonnement push du device courant.
// Clé naturelle = endpoint (unique) : pas de doublon par device, et un
// endpoint réattribué bascule proprement vers l'utilisateur courant.
export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const rl = await rateLimit(
    `push-sub:${user.id}`,
    LIMITS.unread.limit,
    LIMITS.unread.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const { endpoint, keys } = schema.parse(await readJsonLimited(req));

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
});
