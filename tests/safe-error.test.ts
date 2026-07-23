import { describe, expect, it } from "vitest";
import { safeErrorDetails } from "@/lib/security/safe-error";

describe("safeErrorDetails", () => {
  it("ne conserve que le nom et le code techniques bornés", () => {
    const error = Object.assign(new Error("customer@example.com"), {
      code: "P2002",
      requestId: "req_secret",
      meta: { target: "stripe-customer-secret" },
    });

    expect(safeErrorDetails(error)).toEqual({
      errorName: "Error",
      errorCode: "P2002",
    });
    expect(JSON.stringify(safeErrorDetails(error))).not.toContain(
      "customer@example.com",
    );
    expect(JSON.stringify(safeErrorDetails(error))).not.toContain(
      "stripe-customer-secret",
    );
  });

  it("refuse les libellés arbitraires ou injectables", () => {
    expect(
      safeErrorDetails({
        name: "Error\nBearer secret",
        code: "bad code with customer@example.com",
      }),
    ).toEqual({ errorName: "Error" });
    expect(safeErrorDetails("raw secret")).toEqual({
      errorName: "string",
    });
  });
});
