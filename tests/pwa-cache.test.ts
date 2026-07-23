import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLEAR_PRIVATE_CACHES_MESSAGE,
  clearPrivatePwaCaches,
} from "@/lib/pwa-cache";

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");
const originalNavigator = Object.getOwnPropertyDescriptor(
  globalThis,
  "navigator",
);

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCaches) {
    Object.defineProperty(globalThis, "caches", originalCaches);
  } else {
    Reflect.deleteProperty(globalThis, "caches");
  }
  if (originalNavigator) {
    Object.defineProperty(globalThis, "navigator", originalNavigator);
  } else {
    Reflect.deleteProperty(globalThis, "navigator");
  }
});

describe("clearPrivatePwaCaches", () => {
  it("purge tous les caches et prévient le service worker au logout", async () => {
    const postMessage = vi.fn();
    const deleteCache = vi.fn(async () => true);

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { serviceWorker: { controller: { postMessage } } },
    });
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: {
        keys: vi.fn(async () => ["apis", "pages-rsc", "static-next-assets-v1"]),
        delete: deleteCache,
      },
    });

    await clearPrivatePwaCaches();

    expect(postMessage).toHaveBeenCalledWith(CLEAR_PRIVATE_CACHES_MESSAGE);
    expect(deleteCache).toHaveBeenCalledTimes(3);
    expect(deleteCache).toHaveBeenCalledWith("apis");
    expect(deleteCache).toHaveBeenCalledWith("pages-rsc");
    expect(deleteCache).toHaveBeenCalledWith("static-next-assets-v1");
  });

  it("ne bloque pas la déconnexion quand les API PWA échouent", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          controller: {
            postMessage: () => {
              throw new Error("worker indisponible");
            },
          },
        },
      },
    });
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: {
        keys: vi.fn(async () => {
          throw new Error("cache indisponible");
        }),
      },
    });

    await expect(clearPrivatePwaCaches()).resolves.toBeUndefined();
  });
});
