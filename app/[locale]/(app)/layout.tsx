import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/security/session";
import { BottomNav } from "@/components/BottomNav";
import { SacredMotif } from "@/components/SacredMotif";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const user = await getSessionUser();
  if (!user) redirect({ href: "/login", locale: params.locale });

  return (
    <div className="relative mx-auto min-h-dvh max-w-md overflow-x-hidden pb-24 lg:max-w-5xl">
      <SacredMotif variant="tree" className="right-[-140px] top-[60px]" />
      {children}
      <BottomNav married={user!.season !== "JOURNEY"} />
    </div>
  );
}
