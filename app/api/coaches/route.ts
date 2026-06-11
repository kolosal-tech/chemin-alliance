import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withErrors } from "@/lib/api-helpers";

export const GET = withErrors(async () => {
  const coaches = await prisma.coach.findMany({
    orderBy: { ratingAvg: "desc" },
  });
  return NextResponse.json(coaches);
});
