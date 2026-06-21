import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/marketing/icons";

/**
 * Bloc « sécurité » réutilisable (Deliverable 4) - purement informationnel.
 * Rappelle que les outils de sécurité (bloquer, signaler, contrôler sa
 * visibilité) sont toujours gratuits. N'ouvre aucun endpoint : il renvoie vers
 * les pages existantes (politique de confidentialité). Composant serveur.
 */
export async function SafetyBlock() {
  const t = await getTranslations("product.safety");
  const points = ["block", "report", "visibility"] as const;

  return (
    <section className="rounded-cardlg border border-sage/30 bg-sage/[0.06] p-5 dark:border-[#2C4A38] dark:bg-[#16241C]/60">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-card bg-sage/15 text-sage dark:bg-[#2C4A38]/50 dark:text-[#8FC6A2]">
          <Icon name="shield" className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[17px] text-night dark:text-[#ECE7DD]">
            {t("title")}
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-warmgray dark:text-[#9A958B]">
            {t("intro")}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-center gap-2 text-[13px] text-night dark:text-[#ECE7DD]"
          >
            <span
              aria-hidden
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sage/20 text-sage dark:bg-[#2C4A38]/60 dark:text-[#8FC6A2]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5l4 4 10-11"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {t(`points.${p}`)}
          </li>
        ))}
      </ul>
      <Link
        href="/legal/privacy"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-sage hover:gap-2.5 dark:text-[#8FC6A2]"
      >
        {t("learnMore")}
        <Icon
          name="arrowRight"
          className="h-4 w-4 transition-all"
          strokeWidth={1.9}
        />
      </Link>
    </section>
  );
}
