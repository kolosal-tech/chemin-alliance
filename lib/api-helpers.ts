import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, code: string, message?: string) {
  return NextResponse.json({ error: code, message }, { status });
}

/** Enveloppe un handler : erreurs Zod -> 400, UNAUTHORIZED -> 401, etc. */
export function withErrors<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse | Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (err) {
      // Erreurs de contrôle interne Next (analyse statique) : relancer.
      if (
        typeof err === "object" &&
        err &&
        "digest" in err &&
        String((err as { digest: unknown }).digest).startsWith(
          "DYNAMIC_SERVER_USAGE",
        )
      ) {
        throw err;
      }
      if (err instanceof ZodError) {
        return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message);
      }
      const status =
        typeof err === "object" && err && "status" in err
          ? Number((err as { status: unknown }).status)
          : 500;
      if (status === 401) return jsonError(401, "UNAUTHORIZED");
      if (status === 403) return jsonError(403, "FORBIDDEN");
      if (status === 404) return jsonError(404, "NOT_FOUND");
      if (status === 503) return jsonError(503, "SERVICE_UNAVAILABLE");
      console.error("[api]", err);
      return jsonError(500, "INTERNAL_ERROR");
    }
  };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
