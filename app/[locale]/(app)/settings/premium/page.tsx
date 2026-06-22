import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageUser } from "@/lib/security/page-auth";
import { prisma } from "@/lib/db";
import { stripeEnabled } from "@/lib/payments/provider";
import { SubscribeButton } from "./subscribe-button";
import { PortalButton } from "./portal-button";

export const dynamic = "force-dynamic";

const FEATURES = ["discovery", "report", "ai", "calls"] as const;

export default async function PremiumPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string };
}) {
  setRequestLocale(params.locale);
  const user = await requirePageUser(params.locale);
  const t = await getTranslations("premium");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subscriptionStatus: true },
  });
  const active = me?.subscriptionStatus === "active";
  // Retour de Stripe : le webhook peut tarder quelques secondes à basculer le
  // statut. On accuse réception du paiement plutôt que de réafficher l'état
  // « non abonné » (qui se lirait « rien ne s'est passé »).
  const justPaid = !active && searchParams?.status === "success";

  return (
    <main className="px-4 pt-6 safe-top lg:mx-auto lg:max-w-xl">
      <span className="lbl text-[12px] text-gold-deep dark:text-gold-light">
        {t("kicker")}
      </span>
      <h1 className="mb-1 mt-1 font-display text-[29px] leading-tight text-night dark:text-[#ECE7DD]">
        {t("title")}
      </h1>
      <p className="mt-2 text-[17px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("subtitle")}
      </p>

      <div className="mt-5 rounded-cardlg border border-gold/40 bg-[#FBF6E9] p-5 dark:border-[#463A1F] dark:bg-[#272117]">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl text-night dark:text-[#ECE7DD]">
            {t("price")}
          </span>
          <span className="text-[16px] text-warmgray dark:text-[#C2B488]">
            {t("perMonth")}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-2.5">
          {FEATURES.map((f) => (
            <li
              key={f}
              className="flex gap-2.5 text-[16px] leading-snug text-[#3A372F] dark:text-[#CFCAC0]"
            >
              <span aria-hidden className="text-gold">
                ✓
              </span>
              {t(`feature_${f}`)}
            </li>
          ))}
        </ul>

        {active ? (
          <>
            <p className="mt-4 rounded-btn bg-[#EAF0EB] px-3.5 py-3 text-center text-[16px] font-semibold text-sage dark:bg-[#1B2A20]">
              {t("activeBadge")}
            </p>
            {stripeEnabled && <PortalButton label={t("manage")} />}
          </>
        ) : justPaid ? (
          <p className="mt-4 rounded-btn bg-[#FBF6E9] px-3.5 py-3 text-center text-[16px] font-semibold text-gold-ink dark:bg-[#272117] dark:text-[#E0C77A]">
            {t("pendingActivation")}
          </p>
        ) : stripeEnabled ? (
          <SubscribeButton label={t("cta")} />
        ) : (
          <p className="mt-4 rounded-btn bg-surface px-3.5 py-3 text-center text-[16px] text-warmgray dark:bg-anthracite-800 dark:text-[#9A958B]">
            {t("comingSoon")}
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-[15px] leading-normal text-sand-500 dark:text-[#65625B]">
        {t("freeNote")}
      </p>
    </main>
  );
}
