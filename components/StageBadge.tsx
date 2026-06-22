import { useTranslations } from "next-intl";
import type { AllianceStage } from "@prisma/client";

export function StageBadge({ stage }: { stage: AllianceStage }) {
  const t = useTranslations();
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] bg-gold-surface px-2 py-0.5 text-[10px] font-semibold text-gold-ink dark:bg-gold-darkSurface dark:text-gold-darkInk">
      {t("messaging.stageBadge", { stage: t(`stages.${stage}`) })}
    </span>
  );
}
