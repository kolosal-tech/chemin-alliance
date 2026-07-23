import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import middleware from "@/middleware";

vi.mock("next-intl/middleware", () => ({
  default: () => () => {
    throw new Error("INTL_MIDDLEWARE_NOT_EXPECTED_FOR_API_TEST");
  },
}));

function photoRequest(headers: Record<string, string>) {
  return new NextRequest("https://alliance.example/api/me/photo", {
    method: "POST",
    headers: {
      host: "alliance.example",
      ...headers,
    },
  });
}

describe("middleware de sécurité API", () => {
  it("rejette un upload photo intersite avant le handler", async () => {
    const response = middleware(
      photoRequest({
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "CROSS_SITE_REQUEST_REJECTED",
    });
  });

  it("autorise l'upload photo même origine sans lui appliquer le plafond JSON", () => {
    const response = middleware(
      photoRequest({
        origin: "https://alliance.example",
        "sec-fetch-site": "same-origin",
        "content-length": String(5 * 1024 * 1024),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("conserve le plafond global pour les autres mutations API", async () => {
    const response = middleware(
      new NextRequest("https://alliance.example/api/me", {
        method: "PATCH",
        headers: {
          host: "alliance.example",
          origin: "https://alliance.example",
          "sec-fetch-site": "same-origin",
          "content-length": String(5 * 1024 * 1024),
        },
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: "PAYLOAD_TOO_LARGE",
    });
  });
});
