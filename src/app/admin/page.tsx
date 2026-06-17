import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getProfileByUserId } from "@/features/profile/services/profile.server.service";
import { getAccessibleSitesForCurrentUser } from "@/features/sites/services/sites.server.service";
import { createClient } from "@/lib/supabase/server";

const adminLoginRedirect = "/login?redirectedFrom=%2Fadmin";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message !== "Auth session missing!") {
      console.error("Unexpected auth error on /admin.", error);
    }

    redirect(adminLoginRedirect);
  }

  if (!user) {
    redirect(adminLoginRedirect);
  }

  const userId = user.id;

  const [initialProfile, initialSites] = await Promise.all([
    getProfileByUserId(userId),
    getAccessibleSitesForCurrentUser(userId),
  ]);

  return (
    <AdminShell
      initialProfile={initialProfile}
      initialSites={initialSites}
      userEmail={user.email ?? "admin"}
      userId={userId}
    />
  );
}
