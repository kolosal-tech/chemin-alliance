"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

type State =
  | "loading"
  | "unsupported"
  | "disabled"
  | "denied"
  | "off"
  | "on"
  | "busy";

const btnCls =
  "w-full rounded-btnsm bg-navy py-3 text-sm font-semibold text-[#F4F1EA] disabled:opacity-50 dark:bg-gold-light dark:text-anthracite-900";
const btnGhostCls =
  "w-full rounded-btnsm border border-sand-400 py-3 text-sm font-semibold text-night disabled:opacity-50 dark:border-anthracite-600 dark:text-[#ECE7DD]";

/** base64url (clé VAPID publique) -> Uint8Array attendu par PushManager. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationsPanel({
  serverEnabled,
}: {
  serverEnabled: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (!serverEnabled) {
      setState("disabled");
      return;
    }
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      setState("unsupported");
      return;
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    const ua = window.navigator.userAgent;
    setIsIOS(
      /iphone|ipad|ipod/i.test(ua) ||
        (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1),
    );

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [serverEnabled]);

  async function enable() {
    setError(null);
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const keyRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        setState("disabled");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!saveRes.ok) throw new Error("save_failed");
      setState("on");
    } catch {
      setError(t("notifications.errorEnable"));
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const res = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        // Sans ce contrôle, un échec serveur (la ligne reste en base) afficherait
        // quand même « désactivé » alors que le push continue.
        if (!res.ok) throw new Error("unsubscribe_failed");
        await sub.unsubscribe();
      }
      setState("off");
      toast.success(t("notifications.disabledDone"));
    } catch {
      setError(t("notifications.errorDisable"));
      setState("on");
    } finally {
      setConfirmDisable(false);
    }
  }

  return (
    <main className="px-5 pt-6 safe-top lg:mx-auto lg:max-w-2xl">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/settings/privacy"
          className="lbl text-[10px] text-warmgray dark:text-[#9A958B]"
        >
          ← {t("notifications.back")}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <h1 className="mb-2 font-display text-2xl font-medium text-night dark:text-[#ECE7DD]">
        {t("notifications.title")}
      </h1>
      <p className="mb-5 text-[13px] leading-relaxed text-warmgray dark:text-[#9A958B]">
        {t("notifications.intro")}
      </p>

      <div className="rounded-card border border-sand-200 bg-surface p-5 dark:border-anthracite-600 dark:bg-anthracite-800">
        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden className="text-xl text-gold">
            🔔
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-night dark:text-[#ECE7DD]">
              {state === "on"
                ? t("notifications.statusOn")
                : t("notifications.statusOff")}
            </p>
            <p className="mt-0.5 text-[12px] text-warmgray dark:text-[#9A958B]">
              {t("notifications.events")}
            </p>
          </div>
          <span
            aria-hidden
            className={`h-2.5 w-2.5 rounded-full ${
              state === "on" ? "bg-sage" : "bg-sand-400 dark:bg-anthracite-600"
            }`}
          />
        </div>

        {state === "loading" && (
          <p
            className="text-[12px] text-warmgray dark:text-[#9A958B]"
            aria-live="polite"
          >
            {t("common.loading")}
          </p>
        )}

        {state === "unsupported" && (
          <p className="text-[13px] text-amberink dark:text-[#E0B978]">
            {t("notifications.unsupported")}
          </p>
        )}

        {state === "disabled" && (
          <p className="text-[13px] text-warmgray dark:text-[#9A958B]">
            {t("notifications.soon")}
          </p>
        )}

        {state === "denied" && (
          <p className="text-[13px] text-amberink dark:text-[#E0B978]">
            {t("notifications.denied")}
          </p>
        )}

        {(state === "off" || state === "busy") && serverEnabled && (
          <button
            type="button"
            onClick={enable}
            disabled={state === "busy"}
            className={btnCls}
          >
            {state === "busy"
              ? t("notifications.busy")
              : t("notifications.enable")}
          </button>
        )}

        {state === "on" && (
          <button
            type="button"
            onClick={() => setConfirmDisable(true)}
            className={btnGhostCls}
          >
            {t("notifications.disable")}
          </button>
        )}

        {error && (
          <p className="mt-3 text-[12px] text-clayred dark:text-[#E59B91]">
            {error}
          </p>
        )}

        {isIOS && !isStandalone && serverEnabled && state !== "unsupported" && (
          <p className="mt-4 border-t border-sand-200 pt-3 text-[12px] leading-relaxed text-warmgray dark:border-anthracite-600 dark:text-[#9A958B]">
            {t("notifications.iosHint")}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmDisable}
        title={t("notifications.disableConfirmTitle")}
        body={t("notifications.disableConfirmBody")}
        confirmLabel={t("notifications.disable")}
        onConfirm={disable}
        onCancel={() => setConfirmDisable(false)}
      />
    </main>
  );
}
