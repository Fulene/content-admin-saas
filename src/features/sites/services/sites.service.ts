import { ZodError } from "zod";
import { siteListSchema } from "@/features/sites/schemas/site.schema";
import type { Site } from "@/features/sites/types/site";

const SITE_MEMBER_SELECT =
  "site_id, roles(id,code,label), sites(id,name,slug,status)";
const SITES_SELECT = "id,name,slug,status";

type SiteMemberRow = {
  roles: Site["currentUserRole"] | Site["currentUserRole"][];
  site_id: string;
  sites: Omit<Site, "currentUserRole"> | Omit<Site, "currentUserRole">[] | null;
};

export async function getAccessibleSites(): Promise<Site[]> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

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

export function parseSiteMemberRows(rows: SiteMemberRow[]): Site[] {
  const sites = rows.flatMap((row) => {
    const role = Array.isArray(row.roles) ? (row.roles[0] ?? null) : row.roles;
    const rowSites = Array.isArray(row.sites)
      ? row.sites
      : row.sites
        ? [row.sites]
        : [];

    return rowSites.map((site) => ({
      ...site,
      currentUserRole: role,
    }));
  });

  const uniqueSites = Array.from(
    new Map(sites.map((site) => [site.id, site])).values(),
  );

  return siteListSchema.parse(uniqueSites);
}

export function parseSiteRows(rows: Array<Omit<Site, "currentUserRole">>): Site[] {
  return siteListSchema.parse(
    rows.map((site) => ({
      ...site,
      currentUserRole: null,
    })),
  );
}

export { SITES_SELECT };
