export class MultipartPayloadTooLargeError extends Error {
  constructor() {
    super("MULTIPART_PAYLOAD_TOO_LARGE");
    this.name = "MultipartPayloadTooLargeError";
  }
}

export class InvalidMultipartError extends Error {
  constructor() {
    super("INVALID_MULTIPART");
    this.name = "InvalidMultipartError";
  }
}

/**
 * Lit un multipart avec une borne réellement appliquée au flux.
 *
 * `Content-Length` n'est qu'un rejet anticipé : un client peut l'omettre ou
 * annoncer une valeur inférieure au body réel. La somme des chunks reste donc
 * l'autorité avant tout appel à `formData()`, qui bufferise le contenu.
 */
export async function readMultipartFormDataLimited(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("maxBytes must be a positive safe integer");
  }

  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new MultipartPayloadTooLargeError();
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data(?:;|$)/i.test(contentType)) {
    throw new InvalidMultipartError();
  }
  if (!request.body) throw new InvalidMultipartError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new MultipartPayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return await new Response(body, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new InvalidMultipartError();
  }
}
