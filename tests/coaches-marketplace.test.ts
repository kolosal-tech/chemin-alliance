import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  coachFindMany: vi.fn(),
  coachFindUnique: vi.fn(),
  bookingCreate: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    coach: {
      findMany: mocks.coachFindMany,
      findUnique: mocks.coachFindUnique,
    },
    booking: {
      create: mocks.bookingCreate,
    },
  },
}));

import { GET as listCoaches } from "@/app/api/coaches/route";
import { GET as getCoach } from "@/app/api/coaches/[id]/route";
import { POST as createBooking } from "@/app/api/coaches/[id]/bookings/route";

describe("marketplace de coachs fermé par défaut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
  });

  it("ne publie aucun catalogue, même si la base contient des fiches", async () => {
    mocks.coachFindMany.mockResolvedValue([
      { id: "coach-demo", certified: false },
    ]);

    const response = await listCoaches();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "COACH_MARKETPLACE_UNAVAILABLE",
    });
    expect(mocks.coachFindMany).not.toHaveBeenCalled();
  });

  it("ne publie aucune fiche par identifiant direct", async () => {
    mocks.coachFindUnique.mockResolvedValue({
      id: "coach-demo",
      certified: false,
    });

    const response = await getCoach(
      new Request("https://app.test/api/coaches/coach-demo"),
      { params: Promise.resolve({ id: "coach-demo" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "COACH_MARKETPLACE_UNAVAILABLE",
    });
    expect(mocks.coachFindUnique).not.toHaveBeenCalled();
  });

  it("rejette tout créneau forgé sans créer de réservation", async () => {
    const response = await createBooking(
      new Request("https://app.test/api/coaches/coach-demo/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotStart: "2030-01-01T10:00:00.000Z" }),
      }),
      { params: Promise.resolve({ id: "coach-demo" }) },
    );

    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "BOOKING_UNAVAILABLE",
    });
    expect(mocks.coachFindUnique).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("conserve la protection d'authentification de la réservation", async () => {
    mocks.requireUser.mockRejectedValue({ status: 401 });

    const response = await createBooking(
      new Request("https://app.test/api/coaches/coach-demo/bookings", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: "coach-demo" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "UNAUTHORIZED" });
    expect(mocks.coachFindUnique).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
  });

  it("n'affiche aucun faux créneau, tarif ou bouton de réservation", () => {
    const source = readFileSync(
      new URL(
        "../app/[locale]/(app)/coaches/[id]/booking-panel.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain('t("marketplaceUnavailableTitle")');
    expect(source).toContain('t("marketplaceUnavailableBody")');
    expect(source).not.toContain("new Date");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("res.status === 409");
    expect(source).not.toContain("<button");
    expect(source).not.toContain("priceEUR");
  });
});
