import { getTranslations } from "next-intl/server";
import { BlurhashImage } from "@/components/BlurhashImage";
import type { DiscoveryTeaser } from "@/lib/matching";

const GRADIENTS = [
  "radial-gradient(110% 90% at 35% 25%, #6E7790 0%, #41506E 50%, #222F4C 100%)",
  "radial-gradient(110% 90% at 40% 30%, #8A7A6A 0%, #5C4D44 50%, #352A28 100%)",
  "radial-gradient(110% 90% at 30% 25%, #6F8478 0%, #43564B 50%, #26342C 100%)",
];

/**
 * P3 : aperçu de découverte PRE-VERIFICATION. Silhouettes floutées, ni nom ni
 * intention ni action : juste un signal « il y a un vivier qui t'attend » pour
 * motiver la vérification email. Non interactif (aria-hidden) ; le matching
 * réel reste fermé tant que l'email n'est pas vérifié.
 */
export async function DiscoveryPreview({
  teasers,
}: {
  teasers: DiscoveryTeaser[];
}) {
  if (teasers.length === 0) return null;
  const t = await getTranslations("suggestions");
  return (
    <section className="lg:col-span-3">
      <p className="lbl mb-2 text-[12px] text-gold-deep dark:text-gold-light">
        {t("previewTitle", { count: teasers.length })}
      </p>
      <div className="grid grid-cols-3 gap-2.5" aria-hidden>
        {teasers.map((teaser, i) => (
          <div
            key={i}
            className="relative aspect-[3/4] overflow-hidden rounded-card"
            style={{ background: GRADIENTS[i % 3] }}
          >
            {teaser.photoBlurhash && (
              <BlurhashImage
                hash={teaser.photoBlurhash}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Voile supplémentaire : encore plus anonyme que les cartes normales. */}
            <div className="absolute inset-0 bg-night/25 backdrop-blur-[3px]" />
            <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-night/50 text-[#E7E2D6]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="10.5"
                  width="14"
                  height="9.5"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            {teaser.age != null && (
              <div className="absolute inset-x-0 bottom-1.5 text-center text-[15px] font-semibold text-[#F4F1EA] [text-shadow:0_1px_6px_rgba(0,0,0,.5)]">
                {t("previewAge", { age: teaser.age })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
