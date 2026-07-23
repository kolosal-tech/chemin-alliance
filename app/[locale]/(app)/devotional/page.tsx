import { setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { getDailyDevotion, isSameUtcDay } from "@/lib/devotional";
import type { Locale } from "@/lib/core-engine";
import { DevotionalClient } from "./devotional-client";

export default async function DevotionalPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const now = new Date();
  const devotion = getDailyDevotion(params.locale as Locale, now);
  return (
    <DevotionalClient
      devotion={devotion}
      initialStreak={{
        current: user.currentStreak,
        longest: user.longestStreak,
      }}
      initialCompleted={isSameUtcDay(user.lastDevotionDate, now)}
      journalOwnerId={user.id}
    />
  );
}
