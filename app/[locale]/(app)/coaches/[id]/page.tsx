import { redirect } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/security/page-auth";

export default async function CoachDetailPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const params = await props.params;
  await requirePageUser(params.locale);
  redirect({ href: "/coaches", locale: params.locale });
}
