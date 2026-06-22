import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function OfflinePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-7 text-center safe-top safe-bottom">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden className="mb-6">
        <line x1="8" y1="28" x2="48" y2="28" stroke="#E2DDD2" strokeWidth="2.5" />
        <line x1="8" y1="28" x2="26" y2="28" stroke="#C9A84C" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="8" cy="28" r="5" fill="#C9A84C" />
        <circle cx="26" cy="28" r="6" fill="#C9A84C" stroke="#F7F5F0" strokeWidth="2.5" />
        <circle cx="48" cy="28" r="4.5" fill="none" stroke="#C8C2B5" strokeWidth="2" />
      </svg>
      <h1 className="font-display text-[31px] text-night dark:text-[#ECE7DD]">{t("offline")}</h1>
      <p className="mt-3 max-w-[34ch] text-[18px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("offlineBody")}
      </p>
    </main>
  );
}
