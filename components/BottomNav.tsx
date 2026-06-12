"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/suggestions", key: "suggestions", icon: "M11 4a7 7 0 1 0 4.9 12l4 4 1.4-1.4-4-4A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" },
  { href: "/messages", key: "messages", icon: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1Z" },
  { href: "/coach-ai", key: "coach", icon: "M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" },
  { href: "/profile", key: "profile", icon: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c4 0 7 2 7 5v1H5v-1c0-3 3-5 7-5Z" },
  { href: "/settings/privacy", key: "settings", icon: "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm8 3 1.7 1.3-1.7 3-2-.6a7 7 0 0 1-1.6 1l-.4 2H12l-.4-2a7 7 0 0 1-1.6-1l-2 .6-1.7-3L8 12l-1.7-1.3 1.7-3 2 .6a7 7 0 0 1 1.6-1l.4-2h4l.4 2a7 7 0 0 1 1.6 1l2-.6 1.7 3L20 12Z" },
] as const;

/**
 * Navigation responsive : barre du bas (mobile/PWA, pouce) qui se
 * réorganise en SIDEBAR latérale sur desktop (lg).
 */
export function BottomNav({ married = false }: { married?: boolean }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const tabs = married
    ? [{ href: "/couple", key: "couple", icon: TABS[0].icon } as const, ...TABS.slice(1)]
    : TABS;

  return (
    <nav
      aria-label="Navigation"
      className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-sand-200/60 dark:border-anthracite-600/60 lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-t-0"
    >
      <Link
        href={married ? "/couple" : "/suggestions"}
        className="hidden items-center gap-2.5 px-6 pb-8 pt-9 lg:flex"
      >
        <span aria-hidden className="inline-block h-px w-[22px] bg-gold" />
        <span className="lbl text-[10px] text-gold-deep dark:text-gold-light">
          {tc("appName")}
        </span>
      </Link>
      <div className="mx-auto flex w-full max-w-md justify-around px-2 py-1.5 lg:mx-0 lg:max-w-none lg:flex-col lg:justify-start lg:gap-1 lg:px-3">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[60px] flex-col items-center gap-0.5 rounded-btn px-2 py-1.5 text-[10px] font-medium lg:min-w-0 lg:flex-row lg:gap-3 lg:px-4 lg:py-3 lg:text-sm ${
                active
                  ? "text-gold-deep dark:text-gold-light lg:bg-gold/10"
                  : "text-warmgray hover:lg:bg-sand-100/60 dark:text-[#9A958B] dark:hover:lg:bg-anthracite-700/60"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="flex-none">
                <path d={tab.icon} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
