import { describe, it, expect } from "vitest";
import { isStrongPassword } from "@/lib/security/password-validation";

describe("isStrongPassword - règles MDP (12+, minuscule, majuscule, chiffre)", () => {
  it("accepte un MDP conforme", () => {
    expect(isStrongPassword("TeStMdp123456")).toBe(true);
  });
  it("refuse trop court (<12)", () => {
    expect(isStrongPassword("Test1234")).toBe(false);
  });
  it("refuse sans majuscule", () => {
    expect(isStrongPassword("test12345678")).toBe(false);
  });
  it("refuse sans minuscule", () => {
    expect(isStrongPassword("TEST12345678")).toBe(false);
  });
  it("refuse sans chiffre", () => {
    expect(isStrongPassword("TestMdpSansNum")).toBe(false);
  });
  it("refuse trop long (>128)", () => {
    expect(isStrongPassword("Aa1" + "x".repeat(130))).toBe(false);
  });
});
