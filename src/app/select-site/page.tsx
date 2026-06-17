import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteSelectionPage } from "@/features/sites/components/site-selection-page";
import { getAccessibleSitesForCurrentUser } from "@/features/sites/services/sites.server.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sélection du site - content-admin-saas",
};

const selectSiteLoginRedirect = "/login?redirectedFrom=%2Fselect-site";

export default async function SelectSitePage({
  searchParams,
}: {
  searchParams: Promise<{
    choose?: string;
  }>;
}) {
  const { choose } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message !== "Auth session missing!") {
      console.error("Unexpected auth error on /select-site.", error);
    }

    redirect(selectSiteLoginRedirect);
  }

  if (!user) {
    redirect(selectSiteLoginRedirect);
  }

  const userId = user.id;
  const sites = await getAccessibleSitesForCurrentUser(userId);

  if (sites.length === 1) {
    redirect("/admin");
  }

  return (
    <SiteSelectionPage
      shouldUseStoredSite={choose !== "1"}
      sites={sites}
      userId={userId}
    />
  );
}
