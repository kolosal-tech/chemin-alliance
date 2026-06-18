import { describe, it, expect } from "vitest";
import {
  newMessageNotification,
  newRequestNotification,
  requestAcceptedNotification,
} from "@/lib/push-messages";

describe("push-messages", () => {
  it("nouveau message : titre neutre, corps localisé, deep-link, tag", () => {
    const p = newMessageNotification("fr", "m1");
    expect(p.title).toBe("Chemin d'Alliance");
    expect(p.body).toBe("Vous avez reçu un nouveau message");
    expect(p.url).toBe("/fr/messages/m1");
    expect(p.tag).toBe("msg-m1");
  });

  it("ne révèle jamais d'identité ni de contenu (confidentialité)", () => {
    const sender = "Jonathan";
    const all = [
      newMessageNotification("fr", "m1"),
      newRequestNotification("fr"),
      requestAcceptedNotification("fr", "m2"),
    ];
    for (const p of all) {
      expect(p.title).toBe("Chemin d'Alliance");
      expect(p.body).not.toContain(sender);
    }
  });

  it("localise dans les 4 langues supportées", () => {
    expect(newRequestNotification("en").body).toBe("New connection request");
    expect(newRequestNotification("es").body).toBe("Nueva solicitud de encuentro");
    expect(newRequestNotification("pt").body).toBe("Novo pedido de encontro");
  });

  it("locale inconnue ou absente -> repli fr (corps + url)", () => {
    expect(newMessageNotification("de", "x").url).toBe("/fr/messages/x");
    expect(newMessageNotification(null, "x").body).toBe(
      "Vous avez reçu un nouveau message",
    );
    expect(newMessageNotification(undefined, "x").url).toBe("/fr/messages/x");
  });

  it("demande acceptée : deep-link vers le fil + tag", () => {
    const p = requestAcceptedNotification("es", "m9");
    expect(p.url).toBe("/es/messages/m9");
    expect(p.tag).toBe("accept-m9");
    expect(p.body).toBe("Tu solicitud fue aceptada");
  });
});
