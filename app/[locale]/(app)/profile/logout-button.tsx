"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { clearPrivatePwaCaches } from "@/lib/pwa-cache";

export function LogoutButton() {
  const t = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function doLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout");
      await clearPrivatePwaCaches();
      // Le toast survit à la navigation client : le ToastProvider est monté au
      // niveau du layout de locale, qui enveloppe aussi /login.
      toast.success(t("loggedOut"));
      router.push("/login");
      router.refresh();
    } catch {
      toast.error(t("error"));
    } finally {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 w-full rounded-btnsm border border-sand-400 py-3 text-sm font-medium text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]"
      >
        {t("logout")}
      </button>
      <ConfirmDialog
        open={open}
        title={t("logoutConfirmTitle")}
        body={t("logoutConfirmBody")}
        confirmLabel={t("logout")}
        onConfirm={doLogout}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
