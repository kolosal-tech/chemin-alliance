import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { rateLimit, LIMITS } from "@/lib/security/rate-limit";
import {
  photoProxyUrl,
  photoUploadEnabled,
  uploadProfilePhoto,
} from "@/lib/storage";

// Upload Supabase Storage (fetch + service key) => runtime Node obligatoire.
export const runtime = "nodejs";

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  if (!photoUploadEnabled()) return jsonError(503, "PHOTO_DISABLED");

  const rl = await rateLimit(
    `photo:${user.id}`,
    LIMITS.unread.limit,
    LIMITS.unread.windowMs,
  );
  if (!rl.allowed) return jsonError(429, "RATE_LIMITED");

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return jsonError(400, "NO_FILE");

  const result = await uploadProfilePhoto(user.id, {
    type: file.type,
    bytes: await file.arrayBuffer(),
  });
  if (!result.ok) {
    if (result.error === "type") return jsonError(400, "BAD_TYPE");
    if (result.error === "size") return jsonError(400, "TOO_LARGE");
    return jsonError(502, "UPLOAD_FAILED");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { photoUrl: result.url },
  });
  return NextResponse.json({
    ok: true,
    photoUrl: photoProxyUrl(result.url),
  });
});
