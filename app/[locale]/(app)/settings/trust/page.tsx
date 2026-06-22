import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/security/page-auth";
import { TrustBadge } from "@/components/TrustBadge";

export default async function TrustPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations();
  const user = await requirePageUser(params.locale);

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("trust.title")}
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("trust.intro")}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span className="lbl text-[9px] text-gold-deep dark:text-gold-light">
          {t("trust.statusTitle")}
        </span>
        <TrustBadge
          emailVerified={user.isVerified}
          phoneVerified={user.phoneVerified}
        />
      </div>

      {/* Email */}
      <section className="mt-3 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <span aria-hidden className="text-lg">
          {user.isVerified ? "✅" : "✉️"}
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-night dark:text-[#ECE7DD]">
            {user.isVerified
              ? t("trust.emailLevel")
              : t("trust.emailLevelTodo")}
          </div>
          <div className="text-[12.5px] text-warmgray dark:text-[#9A958B]">
            {user.isVerified ? t("trust.emailDone") : t("trust.emailTodo")}
          </div>
        </div>
        {!user.isVerified && (
          <Link
            href="/settings/account"
            className="rounded-btnsm bg-navy px-3 py-2 text-[12.5px] font-semibold text-[#F4F1EA] dark:bg-gold-light dark:text-anthracite-900"
          >
            {t("trust.completeEmail")}
          </Link>
        )}
      </section>

      {/* Téléphone - dormant */}
      <section className="mt-3 flex items-center gap-3 rounded-card border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800">
        <span aria-hidden className="text-lg">
          {user.phoneVerified ? "✅" : "📱"}
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-night dark:text-[#ECE7DD]">
            {user.phoneVerified
              ? t("trust.phoneLevel")
              : t("trust.phoneLevelTodo")}
          </div>
          <div className="text-[12.5px] text-warmgray dark:text-[#9A958B]">
            {user.phoneVerified ? t("trust.phoneDone") : t("trust.phoneSoon")}
          </div>
        </div>
      </section>

      <p className="mt-4 rounded-card border border-[#CFE0D4] bg-[#EAF0EB] px-4 py-3 text-[12.5px] leading-normal text-[#2E5440] dark:border-[#2E4A38] dark:bg-[#1B2A20] dark:text-[#9FC7AC]">
        {t("trust.privacyNote")}
      </p>
    </main>
  );
}
