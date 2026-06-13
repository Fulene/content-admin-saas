"use server";

import { headers } from "next/headers";
import {
  acceptSiteInvitation,
  cancelSiteInvitation,
  createInvitationUrl,
  createSiteInvitation,
  getSiteInvitationByToken,
  getSiteMembersForCurrentUser,
  resendSiteInvitation,
} from "@/features/members/services/members.server.service";
import type {
  SiteInvitation,
  SiteInvitationCheck,
  SiteMember,
} from "@/features/members/types/member";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MemberActionResult = {
  invitation?: SiteInvitation;
  invitationId?: string;
  invitationUrl?: string;
  status: "success" | "error";
  text: string;
};

export async function getSiteMembersAction(siteId: string): Promise<SiteMember[]> {
  return getSiteMembersForCurrentUser(siteId);
}

export async function canManageSiteInvitationsAction({
  siteId,
}: {
  siteId: string;
}) {
  if (!siteId) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("site_members")
    .select("roles(code)")
    .eq("site_id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return false;
  }

  const roles = data?.roles;
  const role = Array.isArray(roles) ? roles[0] : roles;

  return isAdminRoleCode(role?.code);
}

export async function createSiteInvitationAction({
  email,
  roleId,
  siteId,
}: {
  email: string;
  roleId: string;
  siteId: string;
}): Promise<MemberActionResult> {
  try {
    const { invitation, token } = await createSiteInvitation({
      email,
      roleId,
      siteId,
    });

    return {
      invitationId: invitation.id,
      invitationUrl: createInvitationUrl({
        origin: await getRequestOrigin(),
        token,
      }),
      status: "success",
      text: "Invitation créée avec succès.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible de créer l'invitation.",
    };
  }
}

export async function cancelSiteInvitationAction({
  invitationId,
  siteId,
}: {
  invitationId: string;
  siteId: string;
}): Promise<MemberActionResult> {
  try {
    await cancelSiteInvitation({ invitationId, siteId });

    return {
      status: "success",
      text: "Invitation annulée avec succès.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible d'annuler l'invitation.",
    };
  }
}

export async function resendSiteInvitationAction({
  invitationId,
  siteId,
}: {
  invitationId: string;
  siteId: string;
}): Promise<MemberActionResult> {
  try {
    const { invitation, token } = await resendSiteInvitation({
      invitationId,
      siteId,
    });

    return {
      invitationId: invitation.id,
      invitationUrl: createInvitationUrl({
        origin: await getRequestOrigin(),
        token,
      }),
      status: "success",
      text: "Invitation régénérée avec succès.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible de renvoyer l'invitation.",
    };
  }
}

export async function getSiteInvitationByTokenAction({
  token,
}: {
  token: string;
}): Promise<SiteInvitationCheck> {
  try {
    return await getSiteInvitationByToken(token);
  } catch {
    return {
      invitation: null,
      reason: "invalid",
    };
  }
}

export async function acceptSiteInvitationAction({
  token,
}: {
  token: string;
}): Promise<
  MemberActionResult & {
    invitation?: SiteInvitation;
  }
> {
  try {
    const invitation = await acceptSiteInvitation(token);

    return {
      invitation,
      status: "success",
      text: "Invitation acceptée avec succès.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible d'accepter l'invitation.",
    };
  }
}

export async function signUpForInvitationAction({
  email,
  passwordConfirmation,
  password,
  token,
}: {
  email: string;
  passwordConfirmation: string;
  password: string;
  token: string;
}): Promise<
  MemberActionResult & {
    invitation?: SiteInvitation;
  }
> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordError = validateInvitationPassword(password, passwordConfirmation);

  if (passwordError) {
    return {
      status: "error",
      text: passwordError,
    };
  }

  const check = await getSiteInvitationByToken(token);

  if (!check.invitation) {
    return {
      status: "error",
      text: "Invitation invalide.",
    };
  }

  if (check.reason === "expired") {
    return {
      status: "error",
      text: "Cette invitation a expiré.",
    };
  }

  if (check.reason === "status_mismatch") {
    return {
      status: "error",
      text: "Cette invitation n'est plus disponible.",
    };
  }

  if (check.invitation.email !== normalizedEmail) {
    return {
      status: "error",
      text: "L'email saisi ne correspond pas à cette invitation.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: createInvitationUrl({
          origin: await getRequestOrigin(),
          token,
        }),
      },
    });

    if (error) {
      if (isEmailAlreadyRegisteredMessage(error.message)) {
        throw new Error(
          "Il existe déjà un utilisateur avec cet email.",
        );
      }

      throw new Error(error.message);
    }

    if (!data.session) {
      if (isExistingSupabaseAccount(data.user)) {
        throw new Error(
          "Il existe déjà un utilisateur avec cet email.",
        );
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        if (isEmailNotConfirmedMessage(signInError.message)) {
          return {
            status: "success",
            text: "Compte créé. Confirme ton email, puis reviens sur ce lien pour finaliser l'invitation.",
          };
        }

        throw new Error(
          "Le compte a été créé, mais la connexion automatique est bloquée par la configuration Supabase.",
        );
      }
    }

    const invitation = await acceptSiteInvitation(token);

    return {
      invitation,
      status: "success",
      text: "Compte créé et invitation acceptée avec succès.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible de créer le compte.",
    };
  }
}

export async function signInForInvitationAction({
  email,
  password,
  token,
}: {
  email: string;
  password: string;
  token: string;
}): Promise<
  MemberActionResult & {
    invitation?: SiteInvitation;
  }
> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (isEmailNotConfirmedMessage(error.message)) {
        throw new Error(
          "Email non confirmé. Confirme ton email, puis reviens sur ce lien pour accepter l'invitation.",
        );
      }

      throw new Error(
        "Si tu viens de créer ce compte, confirme d'abord ton email. Sinon, vérifie ton mot de passe.",
      );
    }

    const invitation = await acceptSiteInvitation(token);

    return {
      invitation,
      status: "success",
      text: "Invitation acceptée avec succès.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible d'accepter l'invitation.",
    };
  }
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Impossible de déterminer l'URL de l'application.");
  }

  return `${protocol}://${host}`;
}

function validateInvitationPassword(
  password: string,
  passwordConfirmation: string,
) {
  if (password.length < 8) {
    return "8 caractères minimum.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Une majuscule est obligatoire.";
  }

  if (!/[0-9]/.test(password)) {
    return "Un chiffre est obligatoire.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Un symbole est obligatoire.";
  }

  if (!passwordConfirmation) {
    return "Confirmation obligatoire.";
  }

  if (password !== passwordConfirmation) {
    return "Les deux mots de passe doivent correspondre.";
  }

  return null;
}

function isExistingSupabaseAccount(
  user: { identities?: unknown[] | null } | null,
) {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

function isEmailAlreadyRegisteredMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("user already")
  );
}

function isEmailNotConfirmedMessage(message: string) {
  return message.toLowerCase().includes("email not confirmed");
}

function isAdminRoleCode(code: string | null | undefined) {
  return code?.toUpperCase() === "ADMIN";
}
