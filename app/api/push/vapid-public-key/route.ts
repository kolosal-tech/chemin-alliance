import { NextResponse } from "next/server";
import { pushEnabled } from "@/lib/push";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Clé publique VAPID exposée au client pour s'abonner (PushManager.subscribe).
// Servie par l'API (et non inlinée au build) : changer de clé ne force pas
// un redéploiement du front. Renvoie enabled=false si le push est dormant.
export const GET = async () => {
  if (!pushEnabled()) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({
    enabled: true,
    publicKey: env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
  });
};
