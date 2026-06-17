import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteSelectionPage } from "@/features/sites/components/site-selection-page";
import { getAccessibleSitesForCurrentUser } from "@/features/sites/services/sites.server.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sélection du site - content-admin-saas",
};

export default async function SelectSitePage({
  searchParams,
}: {
  searchParams: Promise<{
    choose?: string;
  }>;
}) {
  const { choose } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  const sites = await getAccessibleSitesForCurrentUser();

  if (sites.length === 1) {
    redirect("/admin");
  }

  return (
    <SiteSelectionPage
      shouldUseStoredSite={choose !== "1"}
      sites={sites}
      userId={data.claims.sub}
    />
  );
}
