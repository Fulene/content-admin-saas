import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getProfileByUserId } from "@/features/profile/services/profile.server.service";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  const initialProfile = await getProfileByUserId(data.claims.sub);

  return (
    <AdminShell
      initialProfile={initialProfile}
      userEmail={data.claims.email ?? "admin"}
      userId={data.claims.sub}
    />
  );
}
