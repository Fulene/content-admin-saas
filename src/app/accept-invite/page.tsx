import type { Metadata } from "next";
import { AcceptInvitePage } from "@/features/members/components/accept-invite-page";
import { getSiteInvitationByToken } from "@/features/members/services/members.server.service";

export const metadata: Metadata = {
  title: "Invitation - content-admin-saas",
};

export default async function AcceptInviteRoute({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const { token = "" } = await searchParams;
  const invitationCheck = token
    ? await getSiteInvitationByToken(token)
    : {
        invitation: null,
        reason: "invalid" as const,
      };

  return (
    <AcceptInvitePage invitationCheck={invitationCheck} token={token} />
  );
}
