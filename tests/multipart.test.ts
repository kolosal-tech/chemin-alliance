import { describe, expect, it } from "vitest";
import {
  InvalidMultipartError,
  MultipartPayloadTooLargeError,
  readMultipartFormDataLimited,
} from "@/lib/multipart";

function multipartRequest(text: string): Request {
  const form = new FormData();
  form.set("note", text);
  return new Request("https://alliance.example/upload", {
    method: "POST",
    body: form,
  });
}

describe("lecture multipart bornée", () => {
  it("parse un formulaire valide sous la limite", async () => {
    const form = await readMultipartFormDataLimited(
      multipartRequest("alliance"),
      1_024,
    );

    expect(form.get("note")).toBe("alliance");
  });

  it("rejette le flux réel trop grand sans dépendre de Content-Length", async () => {
    const request = multipartRequest("x".repeat(2_000));
    expect(request.headers.get("content-length")).toBeNull();

    await expect(
      readMultipartFormDataLimited(request, 512),
    ).rejects.toBeInstanceOf(MultipartPayloadTooLargeError);
  });

  it("rejette immédiatement un Content-Length déclaré trop grand", async () => {
    const request = multipartRequest("court");
    request.headers.set("content-length", "2048");

    await expect(
      readMultipartFormDataLimited(request, 1_024),
    ).rejects.toBeInstanceOf(MultipartPayloadTooLargeError);
  });

  it("rejette un contenu non multipart avec une erreur contrôlée", async () => {
    const request = new Request("https://alliance.example/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    await expect(
      readMultipartFormDataLimited(request, 1_024),
    ).rejects.toBeInstanceOf(InvalidMultipartError);
  });
});
