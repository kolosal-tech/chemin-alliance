import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LEGAL, type LegalKey } from "@/lib/legal/content";
import type { Locale } from "@/lib/core-engine";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    (["terms", "privacy", "cookies"] as const).map((doc) => ({ locale, doc })),
  );
}

export default function LegalPage({
  params,
}: {
  params: { locale: string; doc: string };
}) {
  setRequestLocale(params.locale);
  if (
    params.doc !== "terms" &&
    params.doc !== "privacy" &&
    params.doc !== "cookies"
  )
    notFound();
  const doc = LEGAL[params.locale as Locale]?.[params.doc as LegalKey];
  if (!doc) notFound();

  return (
    <main className="mx-auto max-w-2xl px-7 py-12 safe-top safe-bottom">
      <Link href="/" className="flex items-center gap-2.5">
        <span aria-hidden className="inline-block h-px w-[22px] bg-gold" />
        <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
          Chemin d&apos;Alliance
        </span>
      </Link>
      <h1 className="mt-7 font-display text-[34px] leading-tight text-night dark:text-[#ECE7DD]">
        {doc.title}
      </h1>
      <p className="lbl mt-2 text-[9.5px] text-sand-600 dark:text-[#7E7A72]">
        {doc.updated}
      </p>
      <div className="mt-8 flex flex-col gap-7">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-[19px] text-night dark:text-[#ECE7DD]">
              {s.h}
            </h2>
            {s.p.map((para, i) => (
              <p
                key={i}
                className="mt-2 text-[14.5px] leading-relaxed text-warmgray dark:text-[#9A958B]"
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
