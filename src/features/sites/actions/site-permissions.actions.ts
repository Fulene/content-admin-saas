"use server";

import { isGlobalAdminRole } from "@/features/profile/utils/global-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SitePermissions = {
  canManageContent: boolean;
  canManageUsers: boolean;
};

const DEFAULT_SITE_PERMISSIONS: SitePermissions = {
  canManageContent: false,
  canManageUsers: false,
};

type SiteMemberRoleRow = {
  roles: { code: string } | { code: string }[] | null;
};

export async function getCurrentSitePermissionsAction({
  siteId,
}: {
  siteId: string;
}): Promise<SitePermissions> {
  if (!siteId) {
    return DEFAULT_SITE_PERMISSIONS;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return DEFAULT_SITE_PERMISSIONS;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileError && isGlobalAdminRole(profileData?.global_role)) {
    return {
      canManageContent: true,
      canManageUsers: true,
    };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("site_members")
    .select("roles(code)")
    .eq("site_id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SITE_PERMISSIONS;
  }

  const row = data as SiteMemberRoleRow;
  const role = Array.isArray(row.roles) ? (row.roles[0] ?? null) : row.roles;
  const roleCode = role?.code.toUpperCase() ?? "";

  return {
    canManageContent: isAdminRoleCode(roleCode) || roleCode === "EDITOR",
    canManageUsers: isAdminRoleCode(roleCode),
  };
}

function isAdminRoleCode(code: string | null | undefined) {
  return code?.toUpperCase() === "ADMIN";
}
