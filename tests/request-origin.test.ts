import { describe, expect, it } from "vitest";
import {
  isUntrustedMutationRequest,
  requestTargetOrigin,
} from "@/lib/security/request-origin";

const base = {
  method: "POST",
  requestOrigin: "https://alliance.example",
  originHeader: null,
  secFetchSite: null,
};

describe("garde CSRF des mutations API", () => {
  it("utilise le Host réellement demandé malgré la normalisation Next", () => {
    expect(
      requestTargetOrigin({
        nextUrlOrigin: "http://localhost:3007",
        hostHeader: "127.0.0.1:3007",
        forwardedHostHeader: null,
        forwardedProtoHeader: null,
      }),
    ).toBe("http://127.0.0.1:3007");
  });

  it("respecte le protocole public validé derrière un proxy TLS", () => {
    expect(
      requestTargetOrigin({
        nextUrlOrigin: "http://internal:3000",
        hostHeader: "alliance.example",
        forwardedHostHeader: null,
        forwardedProtoHeader: "https",
      }),
    ).toBe("https://alliance.example");
    expect(
      requestTargetOrigin({
        nextUrlOrigin: "https://alliance.example",
        hostHeader: "alliance.example",
        forwardedHostHeader: null,
        forwardedProtoHeader: "javascript",
      }),
    ).toBe("https://alliance.example");
  });

  it("autorise même origine et les appels serveur sans Origin", () => {
    expect(isUntrustedMutationRequest(base)).toBe(false);
    expect(
      isUntrustedMutationRequest({
        ...base,
        originHeader: "https://alliance.example",
        secFetchSite: "same-origin",
      }),
    ).toBe(false);
  });

  it("rejette un navigateur cross-site même sans Origin exploitable", () => {
    expect(
      isUntrustedMutationRequest({
        ...base,
        secFetchSite: "cross-site",
      }),
    ).toBe(true);
  });

  it("rejette une origine différente, nulle ou invalide", () => {
    for (const originHeader of ["https://evil.example", "null", "not-a-url"]) {
      expect(isUntrustedMutationRequest({ ...base, originHeader })).toBe(true);
    }
  });

  it("n'applique pas la garde aux lectures", () => {
    expect(
      isUntrustedMutationRequest({
        ...base,
        method: "GET",
        originHeader: "https://evil.example",
        secFetchSite: "cross-site",
      }),
    ).toBe(false);
  });
});
