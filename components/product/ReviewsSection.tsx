import { getTranslations } from "next-intl/server";
import { reviews } from "@/content/home";

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          aria-hidden
          className={
            i < rating
              ? "fill-gold dark:fill-gold-light"
              : "fill-sand-300 dark:fill-anthracite-600"
          }
        >
          <path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.9 6.7 19.5l1.1-6L3.4 9.3l6-.8L12 3Z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Section « avis » (Deliverable 4) - preuve sociale notée.
 * Les notes/prénoms (données) vivent dans `content/home.reviews` ; les citations
 * (texte) dans i18n (`product.reviews.items.<id>.quote`). Aucune photo réelle.
 */
export async function ReviewsSection() {
  const t = await getTranslations("product.reviews");

  return (
    <section>
      <p className="lbl text-[12px] text-gold-deep dark:text-gold-light">
        {t("kicker")}
      </p>
      <h2 className="mt-2 font-display text-2xl text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="flex flex-col rounded-cardlg border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800"
          >
            <Stars
              rating={r.rating}
              label={t("ratingLabel", { n: r.rating })}
            />
            <p className="mt-3 flex-1 font-display text-[18px] italic leading-relaxed text-[#3A372F] dark:text-[#CFCAC0]">
              « {t(`items.${r.id}.quote`)} »
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <span
                aria-hidden
                className={`h-8 w-8 flex-none rounded-full bg-gradient-to-br ${r.gradient}`}
              />
              <span className="text-[16px] font-semibold text-night dark:text-[#ECE7DD]">
                {r.name}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
