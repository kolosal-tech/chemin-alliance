"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Événement Chromium d'installation (non typé par TS par défaut).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ca-install-dismissed";

/**
 * Incitation à installer la PWA — auto-masquée si déjà installée (standalone)
 * ou rejetée. Android/Chromium : bouton natif via beforeinstallprompt.
 * iOS Safari : pas d'événement -> instructions « Partager → écran d'accueil ».
 */
export function InstallPrompt() {
  const t = useTranslations("install");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isIos, setIsIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* localStorage indisponible : on continue */
    }

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    // iPad récent se présente comme « Macintosh » + écran tactile.
    const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
    if (ios || iPadOS) {
      setIsIos(true);
      setShow(true);
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-50 mx-auto max-w-md rounded-card border border-gold/40 bg-night/95 p-3.5 text-[#F4F1EA] shadow-phone backdrop-blur dark:border-gold-light/30">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-gold/15"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"
              className="fill-gold"
            />
          </svg>
        </span>
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold leading-snug">
            {t("title")}
          </p>
          {isIos ? (
            <p className="mt-1 text-[12px] leading-normal text-[#A6AEC0]">
              {t("iosHint")}
            </p>
          ) : (
            <button
              type="button"
              onClick={install}
              className="mt-2 rounded-btnsm bg-gold px-4 py-2 text-[13px] font-semibold text-night"
            >
              {t("cta")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="-mr-1 -mt-1 flex-none rounded-full p-1.5 text-[#A6AEC0] hover:text-[#F4F1EA]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
