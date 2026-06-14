import "server-only";

import { ZodError } from "zod";
import { isGlobalAdminRole } from "@/features/profile/utils/global-role";
import {
  parseSiteMemberRows,
  parseSiteRows,
  SITES_SELECT,
} from "@/features/sites/services/sites.service";
import type { Site } from "@/features/sites/types/site";
import { createClient } from "@/lib/supabase/server";

const SITE_MEMBER_SELECT =
  "site_id, roles(id,code,label), sites(id,name,slug,status)";

type SiteMemberRow = {
  roles: Site["currentUserRole"] | Site["currentUserRole"][];
  site_id: string;
  sites: Omit<Site, "currentUserRole"> | Omit<Site, "currentUserRole">[] | null;
};

export async function getAccessibleSitesForCurrentUser(): Promise<Site[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    if (!user) {
      throw new Error("Utilisateur non authentifie.");
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (isGlobalAdminRole(profileData?.global_role)) {
      const { data, error } = await supabase
        .from("sites")
        .select(SITES_SELECT)
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return parseSiteRows((data ?? []) as Array<Omit<Site, "currentUserRole">>);
    }

    const { data, error } = await supabase
      .from("site_members")
      .select(SITE_MEMBER_SELECT)
      .eq("sites.status", "active");

    if (error) {
      throw new Error(error.message);
    }

    return parseSiteMemberRows((data ?? []) as SiteMemberRow[]);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Les sites retournes par Supabase sont invalides.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de charger les sites.");
  }
}
