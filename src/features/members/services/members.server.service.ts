import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type {
  SiteInvitation,
  SiteInvitationCheck,
  SiteMember,
} from "@/features/members/types/member";
import { createAvatarDisplayUrl } from "@/features/profile/services/profile-storage.service";
import { isGlobalAdminRole } from "@/features/profile/utils/global-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SITE_MEMBER_SELECT =
  "site_id,user_id,role_id,created_at,profiles(id,first_name,last_name,avatar_url),roles(id,code,label)";
const SITE_INVITATION_SELECT =
  "id,site_id,role_id,email,status,invited_by,accepted_by,expires_at,accepted_at,created_at,roles(id,code,label),sites(id,name,slug)";

type RawSiteMember = Omit<SiteMember, "email" | "profiles" | "roles"> & {
  profiles:
    | (Omit<NonNullable<SiteMember["profiles"]>, "avatarDisplayUrl">)
    | Array<Omit<NonNullable<SiteMember["profiles"]>, "avatarDisplayUrl">>
    | null;
  roles: SiteMember["roles"] | SiteMember["roles"][];
};
type RawSiteInvitation = Omit<SiteInvitation, "roles" | "sites"> & {
  roles: SiteInvitation["roles"] | SiteInvitation["roles"][];
  sites: SiteInvitation["sites"] | SiteInvitation["sites"][];
};

export async function getSiteMembersForCurrentUser(
  siteId: string,
): Promise<SiteMember[]> {
  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

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

  if (!isGlobalAdminRole(profileData?.global_role)) {
    const { data: currentMember, error: currentMemberError } = await supabase
      .from("site_members")
      .select("site_id,user_id")
      .eq("site_id", siteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentMemberError) {
      throw new Error(currentMemberError.message);
    }

    if (!currentMember) {
      throw new Error("Acces refuse a ce site.");
    }
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("site_members")
    .select(SITE_MEMBER_SELECT)
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const members = await Promise.all(
    ((data ?? []) as RawSiteMember[]).map(async (member) => {
      const { data: userData } = await adminSupabase.auth.admin.getUserById(
        member.user_id,
      );

      return parseSiteMember({
        avatarDisplayUrl: await createAvatarDisplayUrl(
          adminSupabase,
          getRawMemberProfile(member)?.avatar_url ?? null,
        ),
        email: userData.user?.email ?? null,
        member,
      });
    }),
  );

  return members;
}

export async function createSiteInvitation({
  email,
  expiresInDays = 7,
  roleId,
  siteId,
}: {
  email: string;
  expiresInDays?: number;
  roleId: string;
  siteId: string;
}): Promise<{ invitation: SiteInvitation; token: string }> {
  const normalizedEmail = normalizeInvitationEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email invalide.");
  }

  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  if (!roleId) {
    throw new Error("Role invalide.");
  }

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

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("site_invitations")
    .insert({
      email: normalizedEmail,
      expires_at: expiresAt,
      invited_by: user.id,
      role_id: roleId,
      site_id: siteId,
      token_hash: tokenHash,
    })
    .select(SITE_INVITATION_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    invitation: parseSiteInvitation(data as RawSiteInvitation),
    token,
  };
}

export async function cancelSiteInvitation({
  invitationId,
  siteId,
}: {
  invitationId: string;
  siteId: string;
}): Promise<void> {
  if (!invitationId) {
    throw new Error("Invitation invalide.");
  }

  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId)
    .eq("site_id", siteId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

export async function resendSiteInvitation({
  expiresInDays = 7,
  invitationId,
  siteId,
}: {
  expiresInDays?: number;
  invitationId: string;
  siteId: string;
}): Promise<{ invitation: SiteInvitation; token: string }> {
  if (!invitationId) {
    throw new Error("Invitation invalide.");
  }

  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_invitations")
    .update({
      expires_at: expiresAt,
      status: "pending",
      token_hash: tokenHash,
    })
    .eq("id", invitationId)
    .eq("site_id", siteId)
    .neq("status", "accepted")
    .select(SITE_INVITATION_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    invitation: parseSiteInvitation(data as RawSiteInvitation),
    token,
  };
}

export async function getSiteInvitationByToken(
  token: string,
): Promise<SiteInvitationCheck> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      invitation: null,
      reason: "invalid",
    };
  }

  const invitation = await findSiteInvitationByToken(normalizedToken);

  if (!invitation) {
    return {
      invitation: null,
      reason: "invalid",
    };
  }

  if (invitation.status !== "pending") {
    return {
      invitation,
      reason: "status_mismatch",
    };
  }

  if (isExpired(invitation.expires_at)) {
    return {
      invitation: {
        ...invitation,
        status: "expired",
      },
      reason: "expired",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    if (isMissingOrInvalidAuthSession(userError.message)) {
      return {
        invitation,
        reason: "not_authenticated",
      };
    }

    throw new Error(userError.message);
  }

  if (!user) {
    return {
      invitation,
      reason: "not_authenticated",
    };
  }

  if (normalizeInvitationEmail(user.email ?? "") !== invitation.email) {
    return {
      invitation,
      reason: "wrong_email",
    };
  }

  return {
    invitation,
    reason: "success",
  };
}

export async function acceptSiteInvitation(token: string): Promise<SiteInvitation> {
  const check = await getSiteInvitationByToken(token);

  if (!check.invitation) {
    throw new Error("Invitation invalide.");
  }

  if (check.reason === "not_authenticated") {
    throw new Error("Utilisateur non authentifie.");
  }

  if (check.reason === "wrong_email") {
    throw new Error("Cette invitation ne correspond pas a cet utilisateur.");
  }

  if (check.reason === "expired") {
    throw new Error("Cette invitation a expire.");
  }

  if (check.reason === "status_mismatch") {
    throw new Error("Cette invitation n'est plus disponible.");
  }

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

  const adminSupabase = createAdminClient();
  const { data: existingMember, error: existingMemberError } = await adminSupabase
    .from("site_members")
    .select("site_id,user_id")
    .eq("site_id", check.invitation.site_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMemberError) {
    throw new Error(existingMemberError.message);
  }

  if (!existingMember) {
    const { error: insertMemberError } = await adminSupabase
      .from("site_members")
      .insert({
        role_id: check.invitation.role_id,
        site_id: check.invitation.site_id,
        user_id: user.id,
      });

    if (insertMemberError) {
      throw new Error(insertMemberError.message);
    }
  }

  const { data, error } = await adminSupabase
    .from("site_invitations")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
      status: "accepted",
    })
    .eq("id", check.invitation.id)
    .select(SITE_INVITATION_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return parseSiteInvitation(data as RawSiteInvitation);
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createInvitationUrl({
  origin,
  token,
}: {
  origin: string;
  token: string;
}) {
  const url = new URL("/accept-invite", origin);

  url.searchParams.set("token", token);

  return url.toString();
}

function createInvitationToken() {
  return randomBytes(32).toString("hex");
}

function normalizeInvitationEmail(value: string) {
  return value.trim().toLowerCase();
}

function getRawMemberProfile(member: RawSiteMember) {
  return Array.isArray(member.profiles)
    ? (member.profiles[0] ?? null)
    : member.profiles;
}

function parseSiteMember({
  avatarDisplayUrl,
  email,
  member,
}: {
  avatarDisplayUrl: string | null;
  email: string | null;
  member: RawSiteMember;
}): SiteMember {
  const profile = getRawMemberProfile(member);

  return {
    ...member,
    email,
    profiles: profile
      ? {
          ...profile,
          avatarDisplayUrl,
        }
      : null,
    roles: Array.isArray(member.roles) ? (member.roles[0] ?? null) : member.roles,
  };
}

async function findSiteInvitationByToken(
  token: string,
): Promise<SiteInvitation | null> {
  const tokenHash = hashInvitationToken(token);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_site_invitation_by_token_hash",
    {
      p_token_hash: tokenHash,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const [invitation] = (data ?? []) as RawTokenInvitation[];

  if (!invitation) {
    return null;
  }

  return withInvitationSite(parseTokenInvitation(invitation));
}

function isExpired(value: string) {
  return new Date(value).getTime() <= Date.now();
}

function isMissingOrInvalidAuthSession(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("auth session missing") ||
    normalizedMessage.includes("user from sub claim in jwt does not exist")
  );
}

type RawTokenInvitation = Omit<SiteInvitation, "roles"> & {
  role_code: string | null;
  role_label: string | null;
};

function parseTokenInvitation(invitation: RawTokenInvitation): SiteInvitation {
  return {
    accepted_at: invitation.accepted_at,
    accepted_by: invitation.accepted_by,
    created_at: invitation.created_at,
    email: invitation.email,
    expires_at: invitation.expires_at,
    id: invitation.id,
    invited_by: invitation.invited_by,
    role_id: invitation.role_id,
    roles: invitation.role_code
      ? {
          code: invitation.role_code,
          id: invitation.role_id,
          label: invitation.role_label ?? invitation.role_code,
        }
      : null,
    site_id: invitation.site_id,
    sites: null,
    status: invitation.status,
  };
}

function parseSiteInvitation(invitation: RawSiteInvitation): SiteInvitation {
  return {
    ...invitation,
    roles: Array.isArray(invitation.roles)
      ? (invitation.roles[0] ?? null)
      : invitation.roles,
    sites: Array.isArray(invitation.sites)
      ? (invitation.sites[0] ?? null)
      : invitation.sites,
  };
}

async function withInvitationSite(
  invitation: SiteInvitation,
): Promise<SiteInvitation> {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("sites")
      .select("id,name,slug")
      .eq("id", invitation.site_id)
      .single();

    if (error) {
      return invitation;
    }

    return {
      ...invitation,
      sites: data,
    };
  } catch {
    return invitation;
  }
}
