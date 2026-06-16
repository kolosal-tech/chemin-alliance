import { useTranslations } from "next-intl";

// Badge de confiance unifié — surface le niveau de vérification (email,
// téléphone) comme signal de sérieux. N'expose JAMAIS la donnée (email/tél
// restent privés), seulement l'état vérifié. Le téléphone est dormant (Twilio
// non configuré) : on n'affiche le niveau "tél" que s'il est réellement vérifié.
export function TrustBadge({
  emailVerified,
  phoneVerified,
  size = "md",
}: {
  emailVerified: boolean;
  phoneVerified?: boolean;
  size?: "sm" | "md";
}) {
  const t = useTranslations("trust");
  if (!emailVerified && !phoneVerified) return null;
  const both = emailVerified && Boolean(phoneVerified);
  const label = both
    ? t("badge.both")
    : emailVerified
      ? t("badge.email")
      : t("badge.phone");
  const sz = size === "sm" ? "text-[9.5px] px-1.5 py-0.5" : "text-[10.5px] px-2 py-0.5";
  const tone = both
    ? "bg-navy/10 text-navy dark:bg-gold-light/15 dark:text-gold-light"
    : "bg-[#EAF0EB] text-[#2E5440] dark:bg-[#1B2A20] dark:text-[#9FC7AC]";
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-[6px] font-semibold ${tone} ${sz}`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 2.5l2.4 1.7 2.9-.2 1 2.8 2.4 1.6-.8 2.8.8 2.8-2.4 1.6-1 2.8-2.9-.2L12 21.5l-2.4-1.7-2.9.2-1-2.8L3.3 15.6l.8-2.8-.8-2.8 2.4-1.6 1-2.8 2.9.2L12 2.5Z"
          className="fill-current"
        />
        <path
          d="M8.5 12.2l2.2 2.2 4.8-5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="dark:stroke-anthracite-900"
        />
      </svg>
      {label}
    </span>
  );
}
