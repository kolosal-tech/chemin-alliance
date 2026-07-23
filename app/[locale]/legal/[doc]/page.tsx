import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEGAL, type LegalKey } from "@/lib/legal/content";
import {
  asRegime,
  regimeFromIso,
  regimeOverrides,
  REGIME_LABELS,
  REGIME_ORDER,
  type Regime,
} from "@/lib/legal/regimes";
import type { Locale } from "@/lib/core-engine";

// La détection de région (en-tête géo + ?region=) rend la page dynamique.
export const dynamic = "force-dynamic";

type Section = { h: string; p: string[] };

const REGION_UI: Record<
  Locale,
  { adaptedFor: string; change: string; note: string }
> = {
  fr: {
    adaptedFor: "Politique adaptée à votre région :",
    change: "Changer de région",
    note: "Adaptation automatique selon votre pays. Rédaction de première intention, en cours de validation juridique.",
  },
  en: {
    adaptedFor: "Policy adapted to your region:",
    change: "Change region",
    note: "Automatically adapted to your country. First-draft wording, pending legal review.",
  },
  es: {
    adaptedFor: "Política adaptada a tu región:",
    change: "Cambiar de región",
    note: "Adaptada automáticamente a tu país. Redacción inicial, pendiente de revisión legal.",
  },
  pt: {
    adaptedFor: "Política adaptada à tua região:",
    change: "Mudar de região",
    note: "Adaptada automaticamente ao teu país. Redação inicial, em validação jurídica.",
  },
};

/** Remplace les sections §2/§6/§8 de la base par la variante du bloc. */
function applyRegime(
  sections: Section[],
  overrides: ReturnType<typeof regimeOverrides>,
): Section[] {
  if (!overrides) return sections;
  return sections.map((s) => {
    const n = s.h.match(/^(\d+)\./)?.[1];
    if (n === "2") return overrides["2"];
    if (n === "6") return overrides["6"];
    if (n === "8") return overrides["8"];
    return s;
  });
}

export default async function LegalPage(props: {
  params: Promise<{ locale: string; doc: string }>;
  searchParams?: Promise<{ region?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  setRequestLocale(params.locale);
  if (
    params.doc !== "terms" &&
    params.doc !== "privacy" &&
    params.doc !== "cookies"
  )
    notFound();
  const locale = params.locale as Locale;
  const doc = LEGAL[locale]?.[params.doc as LegalKey];
  if (!doc) notFound();

  // Seule la politique de confidentialité est adaptée par bloc réglementaire.
  const isPrivacy = params.doc === "privacy";
  const regime: Regime = isPrivacy
    ? (asRegime(searchParams?.region) ??
      regimeFromIso((await headers()).get("x-vercel-ip-country")))
    : "eu";
  const sections = isPrivacy
    ? applyRegime(doc.sections, regimeOverrides(regime, locale))
    : doc.sections;
  const ui = REGION_UI[locale];

  return (
    <main className="mx-auto max-w-2xl px-7 py-12 safe-top safe-bottom">
      <Link href="/" className="flex items-center gap-2.5">
        <span aria-hidden className="inline-block h-px w-[22px] bg-gold" />
        <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
          Chemin d&apos;Alliance
        </span>
      </Link>
      <h1 className="mt-7 font-display text-[38px] leading-tight text-night dark:text-[#ECE7DD]">
        {doc.title}
      </h1>
      <p className="lbl mt-2 text-[12px] text-sand-600 dark:text-[#8F8A80]">
        {doc.updated}
      </p>

      {isPrivacy && (
        <div className="mt-6 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
          <p className="text-[16px] text-warmgray dark:text-[#9A958B]">
            {ui.adaptedFor}{" "}
            <span className="font-semibold text-night dark:text-[#ECE7DD]">
              {REGIME_LABELS[regime][locale]}
            </span>
          </p>
          <div className="mt-3">
            <span className="lbl text-[11px] text-sand-600 dark:text-[#8F8A80]">
              {ui.change}
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REGIME_ORDER.map((r) => {
                const on = r === regime;
                return (
                  <Link
                    key={r}
                    href={`/legal/privacy?region=${r}`}
                    className={`rounded-full border px-3 py-1 text-[15px] transition-colors ${
                      on
                        ? "border-gold bg-gold/15 font-semibold text-gold-ink dark:border-gold-light/50 dark:text-gold-light"
                        : "border-sand-400 text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
                    }`}
                  >
                    {REGIME_LABELS[r][locale]}
                  </Link>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-snug text-sand-500 dark:text-[#9A958B]">
            {ui.note}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-7">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-[22px] text-night dark:text-[#ECE7DD]">
              {s.h}
            </h2>
            {s.p.map((para, i) => (
              <p
                key={i}
                className="mt-2 text-[17px] leading-relaxed text-warmgray dark:text-[#9A958B]"
              >
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
