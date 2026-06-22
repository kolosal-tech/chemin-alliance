import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/marketing/icons";

type ShowcaseProps = {
  name?: string;
  age?: number;
  /** complétude 0–100 */
  completion?: number;
  /** étape du parcours 1–6 */
  stage?: number;
  verified?: boolean;
};

/**
 * Carte profil gamifiée (Deliverable 4) - présentationnelle, données factices
 * par défaut (vitrine design-system). Met en avant : anneau de complétude,
 * badge vérifié, étape de parcours, tags foi/intention. Aucune donnée réelle,
 * aucun visuel de personne (dégradé flouté en guise d'avatar).
 */
export async function ProfileShowcase({
  name = "Aïcha",
  age = 29,
  completion = 80,
  stage = 2,
  verified = true,
}: ShowcaseProps) {
  const t = await getTranslations("product.showcase");
  const pct = Math.max(0, Math.min(100, completion));
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <article className="max-w-sm rounded-cardlg border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800">
      <div className="flex items-center gap-4">
        <div className="relative h-[72px] w-[72px] flex-none">
          <div
            aria-hidden
            className="h-full w-full rounded-full blur-[5px]"
            style={{
              background:
                "radial-gradient(110% 90% at 35% 25%, #6E7790 0%, #41506E 50%, #222F4C 100%)",
            }}
          />
          <svg
            viewBox="0 0 64 64"
            className="absolute inset-0 -rotate-90"
            aria-hidden
          >
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              strokeWidth="4"
              className="stroke-sand-200 dark:stroke-anthracite-700"
            />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
              className="stroke-gold"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[22px] text-night dark:text-[#ECE7DD]">
              {name}
            </span>
            {verified && (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                aria-label={t("verified")}
              >
                <path
                  d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
                  className="fill-gold dark:fill-gold-light"
                />
              </svg>
            )}
            <span className="text-[16px] text-sand-600 dark:text-[#7E7A72]">
              · {age}
            </span>
          </div>
          <p className="lbl mt-1 text-[11px] text-gold-deep dark:text-gold-light">
            {t("completion", { pct })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="rounded-[7px] bg-[#E7EBF1] px-2 py-0.5 text-[13px] font-semibold text-[#2A3550] dark:bg-[#222C42] dark:text-[#B9C6E0]">
          {t("denomination")}
        </span>
        <span className="rounded-[7px] bg-[#F1EBD9] px-2 py-0.5 text-[13px] font-semibold text-gold-ink dark:bg-[#2C2818] dark:text-gold-light">
          {t("intention")}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-btnsm border border-sand-200 bg-canvas px-3 py-2.5 dark:border-anthracite-600 dark:bg-anthracite-900">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-navy/8 text-[15px] font-bold text-navy dark:bg-gold-light/10 dark:text-gold-light">
          {stage}
        </span>
        <div className="min-w-0">
          <span className="lbl text-[11px] text-gold-deep dark:text-gold-light">
            {t("stageLabel")}
          </span>
          <p className="text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
            {t(`stage.${stage}`)}
          </p>
        </div>
        <Icon
          name="arrowRight"
          className="ml-auto h-4 w-4 text-warmgray dark:text-[#9A958B]"
          strokeWidth={1.8}
        />
      </div>
    </article>
  );
}
