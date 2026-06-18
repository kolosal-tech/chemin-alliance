import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";
import { requireCronAuth } from "@/lib/cron/auth";
import { pushEnabled, sendPushToUser } from "@/lib/push";
import { devotionPushPayload } from "@/lib/push-messages";

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
  let skip = 0;
  let total = 0;
  let sent = 0;
  for (;;) {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, pushSubscriptions: { some: {} } },
      select: { id: true, locale: true },
      skip,
      take: PAGE,
    });
    if (users.length === 0) break;
    total += users.length;
    for (const u of users) {
      sent += await sendPushToUser(u.id, devotionPushPayload(u.locale));
    }
    if (users.length < PAGE) break;
    skip += PAGE;
  }

  return NextResponse.json({ ok: true, total, sent });
});
