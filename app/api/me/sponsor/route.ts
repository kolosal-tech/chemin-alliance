import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withErrors, readJsonLimited } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";
import { withSerializableRetry } from "@/lib/blessing";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().toLowerCase(),
  relation: z.enum(["family", "pastor", "priest", "friend"]),
});

// Le DTO renvoyé au client n'expose que ce qui sert l'UI du propriétaire.
function dto(s: { name: string; email: string; relation: string } | null) {
  return s ? { name: s.name, email: s.email, relation: s.relation } : null;
}

export const GET = withErrors(async () => {
  const user = await requireUser();
  const s = await prisma.sponsor.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ sponsor: dto(s) });
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUser();
  const body = schema.parse(await readJsonLimited(req));
  const s = await withSerializableRetry(async (tx) => {
    const current = await tx.sponsor.findUnique({
      where: { userId: user.id },
      select: { name: true, email: true, relation: true },
    });
    const changed =
      current !== null &&
      (current.name !== body.name ||
        current.email !== body.email ||
        current.relation !== body.relation);

    if (changed) {
      await tx.blessing.deleteMany({
        where: { userId: user.id, status: "PENDING" },
      });
    }

    return tx.sponsor.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...body },
      update: { name: body.name, email: body.email, relation: body.relation },
    });
  });
  return NextResponse.json({ ok: true, sponsor: dto(s) });
});

export const DELETE = withErrors(async () => {
  const user = await requireUser();
  await withSerializableRetry(async (tx) => {
    await tx.blessing.deleteMany({
      where: { userId: user.id, status: "PENDING" },
    });
    await tx.sponsor.deleteMany({ where: { userId: user.id } });
  });
  return NextResponse.json({ ok: true });
});
