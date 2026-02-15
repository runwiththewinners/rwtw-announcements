import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import AnnouncementsClient from "../../AnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;
  const headersList = await headers();

  let isAdmin = false;
  let authenticated = false;

  try {
    const result = await whopsdk.verifyUserToken(headersList, {
      dontThrow: true,
    });
    const userId = (result as any)?.userId ?? null;

    if (userId) {
      authenticated = true;

      try {
        const expAccess = await whopsdk.users.checkAccess(experienceId, { id: userId });
        if (expAccess.access_level === "admin") {
          isAdmin = true;
        }
      } catch {}
    }
  } catch (e) {
    console.error("[ANNOUNCEMENTS] Auth error:", e);
  }

  return (
    <AnnouncementsClient
      authenticated={authenticated}
      isAdmin={isAdmin}
    />
  );
}
