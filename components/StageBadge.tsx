import { useTranslations } from "next-intl";
import type { AllianceStage } from "@prisma/client";

export function StageBadge({ stage }: { stage: AllianceStage }) {
  const t = useTranslations();
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] bg-navy px-2 py-0.5 text-[10px] font-semibold text-[#E8D9A8] dark:bg-[#2C2818] dark:text-gold-light">
      {t("messaging.stageBadge", { stage: t(`stages.${stage}`) })}
    </span>
  );
}
