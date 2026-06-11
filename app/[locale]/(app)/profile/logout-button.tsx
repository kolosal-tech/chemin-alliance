"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="mb-6 w-full rounded-btnsm border border-sand-400 py-3 text-sm font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
    >
      {t("logout")}
    </button>
  );
}
