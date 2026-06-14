import "server-only";

import { ZodError } from "zod";
import { isGlobalAdminRole } from "@/features/profile/utils/global-role";
import {
  managedSiteListSchema,
  managedSiteSchema,
  siteNameInputSchema,
} from "@/features/sites/schemas/site.schema";
import type {
  ManagedSite,
  Site,
  SiteStatus,
} from "@/features/sites/types/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MANAGED_SITES_SELECT = "id,name,slug,status";

type SiteMemberCountRow = {
  site_id: string;
  user_id: string;
};

type SiteRow = Omit<Site, "currentUserRole">;

export async function getManagedSitesForCurrentUser(): Promise<ManagedSite[]> {
  await ensureGlobalSiteManager();

  try {
    const supabase = createAdminClient();
    const [{ data: siteData, error: siteError }, { data: memberData, error: memberError }] =
      await Promise.all([
        supabase
          .from("sites")
          .select(MANAGED_SITES_SELECT)
          .order("name", { ascending: true }),
        supabase.from("site_members").select("site_id,user_id"),
      ]);

    if (siteError) {
      throw new Error(siteError.message);
    }

    if (memberError) {
      throw new Error(memberError.message);
    }

    const memberCounts = getMemberCountsBySite(
      (memberData ?? []) as SiteMemberCountRow[],
    );

    return managedSiteListSchema.parse(
      ((siteData ?? []) as SiteRow[]).map((site) => ({
        ...site,
        currentUserRole: null,
        memberCount: memberCounts.get(site.id) ?? 0,
      })),
    );
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

export async function createManagedSiteForCurrentUser({
  name,
}: {
  name: string;
}): Promise<ManagedSite> {
  await ensureGlobalSiteManager();

  const input = siteNameInputSchema.parse({ name });
  const supabase = createAdminClient();
  const slug = await createUniqueSiteSlug(input.name);

  const { data, error } = await supabase
    .from("sites")
    .insert({
      name: input.name,
      slug,
      status: "active",
    })
    .select(MANAGED_SITES_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return managedSiteSchema.parse({
    ...(data as SiteRow),
    currentUserRole: null,
    memberCount: 0,
  });
}

export async function updateManagedSiteForCurrentUser({
  name,
  siteId,
}: {
  name: string;
  siteId: string;
}): Promise<ManagedSite> {
  await ensureGlobalSiteManager();

  const input = siteNameInputSchema.parse({ name });
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sites")
    .update({ name: input.name })
    .eq("id", siteId)
    .select(MANAGED_SITES_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const memberCount = await getSiteMemberCount(siteId);

  return managedSiteSchema.parse({
    ...(data as SiteRow),
    currentUserRole: null,
    memberCount,
  });
}

export async function updateManagedSiteStatusForCurrentUser({
  siteId,
  status,
}: {
  siteId: string;
  status: SiteStatus;
}): Promise<ManagedSite> {
  await ensureGlobalSiteManager();

  if (status !== "active" && status !== "disabled") {
    throw new Error("Statut de site invalide.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .update({ status })
    .eq("id", siteId)
    .select(MANAGED_SITES_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const memberCount = await getSiteMemberCount(siteId);

  return managedSiteSchema.parse({
    ...(data as SiteRow),
    currentUserRole: null,
    memberCount,
  });
}

export async function deleteManagedSiteForCurrentUser(siteId: string) {
  await ensureGlobalSiteManager();

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_site_cascade", {
    p_site_id: siteId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureGlobalSiteManager() {
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

  const { data, error } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!isGlobalAdminRole(data?.global_role)) {
    throw new Error("Acces refuse.");
  }
}

async function getSiteMemberCount(siteId: string) {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("site_members")
    .select("user_id", { count: "exact", head: true })
    .eq("site_id", siteId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function getMemberCountsBySite(rows: SiteMemberCountRow[]) {
  const counts = new Map<string, Set<string>>();

  for (const row of rows) {
    const siteMembers = counts.get(row.site_id) ?? new Set<string>();
    siteMembers.add(row.user_id);
    counts.set(row.site_id, siteMembers);
  }

  return new Map(
    Array.from(counts.entries()).map(([siteId, userIds]) => [
      siteId,
      userIds.size,
    ]),
  );
}

async function createUniqueSiteSlug(name: string) {
  const supabase = createAdminClient();
  const baseSlug = slugify(name) || "site";
  const { data, error } = await supabase.from("sites").select("slug");

  if (error) {
    throw new Error(error.message);
  }

  const existingSlugs = new Set(
    (data ?? [])
      .map((site) => site.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;

    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
