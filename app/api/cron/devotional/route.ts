import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireCronAuth } from "@/lib/cron/auth";
import { pushEnabled, sendPushToUser } from "@/lib/push";
import { devotionPushPayload } from "@/lib/push-messages";
import { activeSensitiveDataConsentUserWhere } from "@/lib/sensitive-data-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron quotidien : pousse un rappel « méditation du jour » aux utilisateurs
// abonnés aux notifications (présence d'une PushSubscription = opt-in navigateur
// déjà accordé). Aucun contenu/PII dans le push. Best-effort, idempotent.
// Dormant : 503 sans CRON_SECRET ; no-op (sent=0) sans clés VAPID.
export const GET = withErrors(async (req: Request) => {
  requireCronAuth(req);
  if (!pushEnabled()) {
    return NextResponse.json({ skipped: "push-dormant", sent: 0 });
  }

  const PAGE = 200;
  let afterId: string | null = null;
  let total = 0;
  let sent = 0;
  for (;;) {
    const users: Array<{ id: string; locale: string }> =
      await prisma.user.findMany({
        where: {
          deletedAt: null,
          ...activeSensitiveDataConsentUserWhere,
          pushSubscriptions: { some: {} },
          ...(afterId === null ? {} : { id: { gt: afterId } }),
        },
        select: { id: true, locale: true },
        orderBy: { id: "asc" },
        take: PAGE,
      });
    if (users.length === 0) break;
    total += users.length;
    const results = await Promise.allSettled(
      users.map((u) => sendPushToUser(u.id, devotionPushPayload(u.locale))),
    );
    sent += results.reduce(
      (acc, r) => acc + (r.status === "fulfilled" ? r.value : 0),
      0,
    );
    if (users.length < PAGE) break;
    // L'envoi peut purger le dernier abonnement d'un utilisateur. Une
    // pagination par `skip` déplacerait alors l'ensemble et sauterait des
    // membres. Le curseur monotone reste stable malgré ces suppressions.
    afterId = users[users.length - 1].id;
  }

  return NextResponse.json({ ok: true, total, sent });
});
