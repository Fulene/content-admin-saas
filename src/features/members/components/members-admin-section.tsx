"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { MemberActionResult } from "@/features/members/actions/members.actions";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { IconButtonTooltip } from "@/components/feedback/icon-button-tooltip";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import {
  cancelSiteInvitationAction,
  createSiteInvitationAction,
  getSiteMembersAction,
  resendSiteInvitationAction,
} from "@/features/members/actions/members.actions";
import {
  getRoles,
  getSiteInvitations,
  removeSiteMember,
  updateSiteMemberRole,
} from "@/features/members/services/members.service";
import type {
  Role,
  SiteInvitation,
  SiteInvitationStatus,
  SiteMember,
} from "@/features/members/types/member";
import { useActiveSite } from "@/features/sites/components/active-site-provider";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50] as const;
const ROLE_ORDER_BY_CODE: Record<string, number> = {
  ADMIN: 0,
  EDITOR: 1,
  VIEWER: 2,
};
const INVITATION_STATUS_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "En cours", value: "pending" },
  { label: "Acceptée", value: "accepted" },
  { label: "Annulée", value: "cancelled" },
  { label: "Expirée", value: "expired" },
] satisfies Array<{
  label: string;
  value: SiteInvitationStatus | "all";
}>;
type GeneratedInvitationLink = {
  invitationId: string;
  url: string;
};
type MembersTab = "members" | "invitations";

export function MembersAdminSection({
  canBypassLastAdminRule,
  canManageInvitations,
  currentUserId,
  mode,
}: {
  canBypassLastAdminRule: boolean;
  canManageInvitations: boolean;
  currentUserId: string;
  mode: MembersTab;
}) {
  const { activeSiteId } = useActiveSite();
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invitations, setInvitations] = useState<SiteInvitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitationSearchQuery, setInvitationSearchQuery] = useState("");
  const [invitationStatusFilter, setInvitationStatusFilter] =
    useState<SiteInvitationStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [invitationCurrentPage, setInvitationCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [invitationItemsPerPage, setInvitationItemsPerPage] =
    useState<number>(10);
  const [message, setMessage] = useState<ToastMessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<
    string | null
  >(null);
  const [regeneratingInvitationId, setRegeneratingInvitationId] = useState<
    string | null
  >(null);
  const [generatedInvitationLink, setGeneratedInvitationLink] =
    useState<GeneratedInvitationLink | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<SiteMember | null>(null);

  useEffect(() => {
    void loadData();
  }, [activeSiteId]);

  const orderedRoles = useMemo(
    () =>
      roles.toSorted((firstRole, secondRole) => {
        const firstOrder =
          ROLE_ORDER_BY_CODE[firstRole.code.toUpperCase()] ??
          Number.MAX_SAFE_INTEGER;
        const secondOrder =
          ROLE_ORDER_BY_CODE[secondRole.code.toUpperCase()] ??
          Number.MAX_SAFE_INTEGER;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return firstRole.label.localeCompare(secondRole.label);
      }),
    [roles],
  );
  const roleOptions = useMemo(
    () =>
      orderedRoles.map((role) => ({
        id: role.id,
        label: getRoleDisplayLabel(role),
      })),
    [orderedRoles],
  );
  const adminRoleId = useMemo(
    () => roles.find((role) => isAdminRoleCode(role.code))?.id ?? null,
    [roles],
  );
  const adminCount = useMemo(
    () =>
      adminRoleId
        ? members.filter((member) => member.role_id === adminRoleId).length
        : 0,
    [members, adminRoleId],
  );
  const canManageMembers = canManageInvitations;
  const roleFilters = useMemo(
    () => [
      { id: "all", label: "Tous" },
      ...orderedRoles.map((role) => ({
        id: role.id,
        label: getRoleDisplayLabel(role),
      })),
    ],
    [orderedRoles],
  );
  const filteredMembers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return members
      .filter((member) => {
        const matchesRole =
          roleFilter === "all" || member.role_id === roleFilter;
        const searchableText = [
          getMemberDisplayName(member),
          member.user_id,
          member.roles ? getRoleDisplayLabel(member.roles) : null,
          member.roles?.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch =
          normalizedQuery.length === 0 ||
          searchableText.includes(normalizedQuery);

        return matchesRole && matchesSearch;
      })
      .toSorted((firstMember, secondMember) =>
        getMemberDisplayName(firstMember).localeCompare(
          getMemberDisplayName(secondMember),
        ),
      );
  }, [members, roleFilter, searchQuery]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / itemsPerPage),
  );
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredMembers, itemsPerPage]);
  const shouldShowPaginationControls = filteredMembers.length >= 6;
  const filteredInvitations = useMemo(() => {
    const normalizedQuery = invitationSearchQuery.trim().toLowerCase();

    return invitations.filter((invitation) => {
      const matchesStatus =
        invitationStatusFilter === "all" ||
        invitation.status === invitationStatusFilter;
      const searchableText = [
        invitation.email,
        invitation.roles ? getRoleDisplayLabel(invitation.roles) : null,
        invitation.roles?.code,
        getInvitationStatusLabel(invitation.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        normalizedQuery.length === 0 ||
        searchableText.includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  }, [invitationSearchQuery, invitationStatusFilter, invitations]);
  const invitationTotalPages = Math.max(
    1,
    Math.ceil(filteredInvitations.length / invitationItemsPerPage),
  );
  const paginatedInvitations = useMemo(() => {
    const startIndex = (invitationCurrentPage - 1) * invitationItemsPerPage;

    return filteredInvitations.slice(
      startIndex,
      startIndex + invitationItemsPerPage,
    );
  }, [filteredInvitations, invitationCurrentPage, invitationItemsPerPage]);
  const shouldShowInvitationPaginationControls =
    filteredInvitations.length >= 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSiteId, itemsPerPage, roleFilter, searchQuery]);

  useEffect(() => {
    setInvitationCurrentPage(1);
  }, [
    activeSiteId,
    invitationItemsPerPage,
    invitationSearchQuery,
    invitationStatusFilter,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setInvitationCurrentPage((page) => Math.min(page, invitationTotalPages));
  }, [invitationTotalPages]);

  async function loadData() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [memberData, roleData, invitationData] = await Promise.all([
        getSiteMembersAction(activeSiteId),
        getRoles(),
        getSiteInvitations(activeSiteId),
      ]);
      setMembers(memberData);
      setRoles(roleData);
      setInvitations(invitationData);
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de charger les membres.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRoleChange(member: SiteMember, nextRoleId: string) {
    if (!canManageMembers) {
      setMessage({
        status: "error",
        text: "Seuls les admins peuvent modifier les rôles.",
      });
      return;
    }

    if (
      adminRoleId &&
      member.role_id === adminRoleId &&
      nextRoleId !== adminRoleId &&
      adminCount <= 1 &&
      !canBypassLastAdminRule
    ) {
      setMessage({
        status: "error",
        text: "Dernier admin : modification impossible.",
      });
      return;
    }

    setMessage(null);

    try {
      await updateSiteMemberRole({
        siteId: activeSiteId,
        userId: member.user_id,
        roleId: nextRoleId,
      });
      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.user_id === member.user_id
            ? {
                ...currentMember,
                role_id: nextRoleId,
                roles: roles.find((role) => role.id === nextRoleId) ?? null,
              }
            : currentMember,
        ),
      );
      setMessage({ status: "success", text: "Role modifie avec succes." });
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le role.",
      });
    }
  }

  async function confirmRemoval() {
    if (!pendingRemoval) {
      return;
    }

    if (!canManageMembers) {
      setMessage({
        status: "error",
        text: "Seuls les admins peuvent retirer un membre.",
      });
      setPendingRemoval(null);
      return;
    }

    try {
      await removeSiteMember({
        siteId: activeSiteId,
        userId: pendingRemoval.user_id,
      });
      setMembers((currentMembers) =>
        currentMembers.filter(
          (member) => member.user_id !== pendingRemoval.user_id,
        ),
      );
      setPendingRemoval(null);
      setMessage({ status: "success", text: "Membre retire avec succes." });
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de retirer le membre.",
      });
    }
  }

  async function handleCancelInvitation(invitation: SiteInvitation) {
    setCancellingInvitationId(invitation.id);
    setMessage(null);

    try {
      const result = await cancelSiteInvitationAction({
        invitationId: invitation.id,
        siteId: activeSiteId,
      });
      setMessage(result);

      if (result.status === "success") {
        setGeneratedInvitationLink((currentLink) =>
          currentLink?.invitationId === invitation.id ? null : currentLink,
        );
        await loadData();
      }
    } finally {
      setCancellingInvitationId(null);
    }
  }

  async function handleShowInvitation(invitation: SiteInvitation) {
    setRegeneratingInvitationId(invitation.id);
    setMessage(null);

    try {
      const result = await resendSiteInvitationAction({
        invitationId: invitation.id,
        siteId: activeSiteId,
      });
      setMessage(result);
      setGeneratedInvitationLink(
        result.invitationId && result.invitationUrl
          ? {
              invitationId: result.invitationId,
              url: result.invitationUrl,
            }
          : null,
      );

      if (result.status === "success") {
        await loadData();
      }
    } finally {
      setRegeneratingInvitationId(null);
    }
  }

  return (
    <section className="flex min-h-full flex-col gap-5">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      {mode === "invitations" && !canManageInvitations ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-400">
          Acces refuse. Seuls les admins peuvent gerer les invitations.
        </div>
      ) : null}

      {mode === "invitations" && !canManageInvitations ? null : (
        <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
          Utilisateurs
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-950 dark:text-white">
          {mode === "members" ? "Membres du site" : "Invitations du site"}
        </h1>
      </div>

      {mode === "members" ? (
        <div className="flex flex-col gap-4">
      <div className="admin-data-toolbar flex flex-col gap-3">
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher un utilisateur"
            className="h-11 w-full rounded-md border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-center xl:min-w-0">
          {shouldShowPaginationControls ? (
            <>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              <ItemsPerPageControl
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </>
          ) : null}
          <span className="text-xs font-medium text-stone-500 dark:text-stone-500">
            {filteredMembers.length} utilisateur
            {filteredMembers.length > 1 ? "s" : ""} au total
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {roleFilters.map((filter) => {
            const isActive = roleFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setRoleFilter(filter.id)}
                className={[
                  "h-9 cursor-pointer rounded-md border px-3 text-xs font-medium transition-colors sm:h-10 sm:px-4 sm:text-sm",
                  isActive
                    ? "border-[#f44336] bg-red-50 text-stone-950 dark:border-[#ff8a3d] dark:bg-[#24262a] dark:text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#111213]">
        {isLoading ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            Chargement...
          </p>
        ) : null}
        {!isLoading && members.length === 0 ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            Aucun membre pour ce site.
          </p>
        ) : null}
        {!isLoading && members.length > 0 && filteredMembers.length === 0 ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            Aucun resultat.
          </p>
        ) : null}
        {!isLoading && paginatedMembers.length > 0 ? (
          <div className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
            {paginatedMembers.map((member) => {
              const displayName = getMemberDisplayName(member);
              const memberEmail = member.email ?? displayName;
              const isCurrentUser = member.user_id === currentUserId;
              const isAdmin = adminRoleId
                ? member.role_id === adminRoleId
                : false;
              const isProtectedLastAdmin =
                isAdmin && adminCount <= 1 && !canBypassLastAdminRule;

              return (
                <div
                  key={member.user_id}
                  className={[
                    "grid gap-3 px-4 py-4 lg:items-center",
                    canManageMembers
                      ? "sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_minmax(100px,0.65fr)_minmax(100px,0.65fr)_140px_auto] xl:grid-cols-[minmax(260px,1.15fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_180px_auto]"
                      : "sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_minmax(100px,0.65fr)_minmax(100px,0.65fr)_120px]",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-3 sm:col-span-2 lg:col-span-1">
                    <MemberAvatar member={member} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-950 dark:text-white">
                        {memberEmail}
                      </p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-500">
                        {member.user_id}
                      </p>
                    </div>
                  </div>
                  <div className="member-row-cell min-w-0 rounded-lg bg-stone-50 px-3 py-2 dark:bg-[#141517] lg:bg-transparent lg:px-0 lg:py-0 lg:dark:bg-transparent">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 lg:hidden">
                      Prenom
                    </p>
                    <p className="min-w-0 truncate text-sm text-stone-700 dark:text-stone-300 lg:text-center">
                      {member.profiles?.first_name ?? "-"}
                    </p>
                  </div>
                  <div className="member-row-cell min-w-0 rounded-lg bg-stone-50 px-3 py-2 dark:bg-[#141517] lg:bg-transparent lg:px-0 lg:py-0 lg:dark:bg-transparent">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 lg:hidden">
                      Nom
                    </p>
                    <p className="min-w-0 truncate text-sm text-stone-700 dark:text-stone-300 lg:text-center">
                      {member.profiles?.last_name ?? "-"}
                    </p>
                  </div>
                  {canManageMembers ? (
                    <div className="w-full sm:col-span-2 lg:col-span-1 lg:w-[140px] lg:justify-self-end xl:w-[180px]">
                      <SelectDropdown
                        ariaLabel={`Role de ${displayName}`}
                        options={roleOptions}
                        value={member.role_id}
                        onChange={(nextRoleId) =>
                          void handleRoleChange(member, nextRoleId)
                        }
                      />
                    </div>
                  ) : (
                    <div className="member-row-cell rounded-lg bg-stone-50 px-3 py-2 dark:bg-[#141517] lg:bg-transparent lg:px-0 lg:py-0 lg:dark:bg-transparent lg:justify-self-end">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 lg:hidden">
                        Role
                      </p>
                      <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                        {member.roles ? getRoleDisplayLabel(member.roles) : "-"}
                      </span>
                    </div>
                  )}
                  {canManageMembers ? (
                    <IconButtonTooltip
                      label={
                        isCurrentUser
                          ? "Impossible de retirer votre propre compte"
                          : isProtectedLastAdmin
                          ? "Impossible de retirer le dernier admin"
                          : "Retirer"
                      }
                      type="button"
                      onClick={() => {
                        if (isCurrentUser || isProtectedLastAdmin) {
                          return;
                        }

                        setPendingRemoval(member);
                      }}
                      aria-disabled={isCurrentUser || isProtectedLastAdmin}
                      className={[
                        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-[#f44336] hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:col-span-2 lg:col-span-1 lg:w-auto",
                        isCurrentUser || isProtectedLastAdmin
                          ? "cursor-default opacity-50"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Retirer
                    </IconButtonTooltip>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {!isLoading &&
      filteredMembers.length > 0 &&
      shouldShowPaginationControls ? (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          className="mb-4 justify-center"
          onPageChange={setCurrentPage}
        />
      ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="admin-data-toolbar admin-data-toolbar-stacked-tablet flex flex-col gap-3">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={invitationSearchQuery}
                onChange={(event) => setInvitationSearchQuery(event.target.value)}
                placeholder="Rechercher une invitation"
                className="h-11 w-full rounded-md border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-center xl:min-w-0">
              {shouldShowInvitationPaginationControls ? (
                <>
                  <PaginationControls
                    currentPage={invitationCurrentPage}
                    totalPages={invitationTotalPages}
                    onPageChange={setInvitationCurrentPage}
                  />
                  <ItemsPerPageControl
                    itemsPerPage={invitationItemsPerPage}
                    onItemsPerPageChange={setInvitationItemsPerPage}
                  />
                </>
              ) : null}
              <span className="text-xs font-medium text-stone-500 dark:text-stone-500">
                {filteredInvitations.length} invitation
                {filteredInvitations.length > 1 ? "s" : ""} au total
              </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
              {INVITATION_STATUS_FILTERS.map((filter) => {
                const isActive = invitationStatusFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setInvitationStatusFilter(filter.value)}
                    className={[
                      "h-9 cursor-pointer rounded-md border px-3 text-xs font-medium transition-colors sm:h-10 sm:px-4 sm:text-sm",
                      isActive
                        ? "border-[#f44336] bg-red-50 text-stone-950 dark:border-[#ff8a3d] dark:bg-[#24262a] dark:text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsInviteDrawerOpen(true)}
                className="admin-data-toolbar-action group relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[#f44336] text-sm font-semibold text-white transition-[width,background-color] duration-200 ease-out hover:w-[132px] hover:bg-[#d7382d] focus-visible:w-[132px] focus-visible:bg-[#d7382d] dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] dark:focus-visible:bg-[#ff7920]"
                aria-label="Inviter"
              >
                <span className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap pl-8 pr-3 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
                  Inviter
                </span>
              </button>
            </div>
          </div>

          <InvitationsPanel
            cancellingInvitationId={cancellingInvitationId}
            generatedInvitationLink={generatedInvitationLink}
            invitations={paginatedInvitations}
            isLoading={isLoading}
            regeneratingInvitationId={regeneratingInvitationId}
            hasInvitations={invitations.length > 0}
            hasFilteredInvitations={filteredInvitations.length > 0}
            onCancelInvitation={(invitation) => {
              void handleCancelInvitation(invitation);
            }}
            onShowInvitation={(invitation) => {
              void handleShowInvitation(invitation);
            }}
            onDismissInvitationLink={(invitationId) => {
              setGeneratedInvitationLink((currentLink) =>
                currentLink?.invitationId === invitationId ? null : currentLink,
              );
            }}
            onInvitationLinkCopied={() =>
              setMessage({
                status: "success",
                text: "Lien d'invitation copié.",
              })
            }
          />

          {!isLoading &&
          filteredInvitations.length > 0 &&
          shouldShowInvitationPaginationControls ? (
            <PaginationControls
              currentPage={invitationCurrentPage}
              totalPages={invitationTotalPages}
              className="mb-4 justify-center"
              onPageChange={setInvitationCurrentPage}
            />
          ) : null}
        </div>
      )}

      <ConfirmDialog
        cancelLabel="Annuler"
        confirmLabel="Retirer"
        isDanger
        isOpen={Boolean(pendingRemoval)}
        title="Retirer ce membre ?"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoval()}
      >
        Le membre perdra l'acces a ce site. Cette action ne supprime pas son
        profil.
      </ConfirmDialog>

      <InviteUserDrawer
        isOpen={isInviteDrawerOpen}
        roles={orderedRoles}
        siteId={activeSiteId}
        onClose={() => setIsInviteDrawerOpen(false)}
        onInvitationCreated={(result) => {
          setMessage(result);
          setGeneratedInvitationLink(
            result.invitationId && result.invitationUrl
              ? {
                  invitationId: result.invitationId,
                  url: result.invitationUrl,
                }
              : null,
          );
          setIsInviteDrawerOpen(false);
          void loadData();
        }}
      />
        </>
      )}
    </section>
  );
}

function InviteUserDrawer({
  isOpen,
  roles,
  siteId,
  onClose,
  onInvitationCreated,
}: {
  isOpen: boolean;
  roles: Role[];
  siteId: string;
  onClose: () => void;
  onInvitationCreated: (result: MemberActionResult) => void;
}) {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailError = getInviteEmailError(email);
  const shouldShowEmailError = emailTouched && Boolean(emailError);
  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id,
        label: getRoleDisplayLabel(role),
      })),
    [roles],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEmail("");
    setEmailTouched(false);
    setRoleId(
      roles.find((role) => role.code === "EDITOR")?.id ?? roles[0]?.id ?? "",
    );
  }, [isOpen, roles]);

  async function handleSubmit() {
    setEmailTouched(true);

    if (emailError || !roleId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createSiteInvitationAction({
        email,
        roleId,
        siteId,
      });
      onInvitationCreated(result);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        className="article-create-drawer-backdrop-in absolute inset-0 cursor-pointer bg-black/35"
        aria-label="Fermer le panneau"
      />

      <aside className="article-create-drawer-in relative z-[1] flex h-full max-h-dvh w-full flex-col border-l border-stone-200 bg-white shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517] sm:max-w-none lg:max-w-[520px]">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-[#2d2e30]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
              Acces
            </p>
            <h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">
              Inviter un utilisateur
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#111213] dark:text-stone-300 dark:hover:bg-[#18191b]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Email <span className="text-[#f44336]">*</span>
            </span>
            <input
              type="email"
              value={email}
              onBlur={() => setEmailTouched(true)}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="utilisateur@example.com"
              aria-invalid={shouldShowEmailError}
              aria-describedby={shouldShowEmailError ? "invite-email-error" : undefined}
              className={[
                "h-11 rounded-md border bg-white px-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500",
                shouldShowEmailError
                  ? "border-[#f44336] focus:border-[#f44336] dark:border-red-400 dark:focus:border-red-400"
                  : "border-stone-200 focus:border-stone-400 dark:border-[#2d2e30] dark:focus:border-[#ff8a3d]",
              ].join(" ")}
            />
            {shouldShowEmailError ? (
              <span
                id="invite-email-error"
                className="text-xs font-medium text-[#f44336] dark:text-red-300"
              >
                {emailError}
              </span>
            ) : null}
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Role <span className="text-[#f44336]">*</span>
            </span>
            <SelectDropdown
              ariaLabel="Role de l'utilisateur invite"
              options={roleOptions}
              value={roleId}
              onChange={setRoleId}
            />
          </div>

        </div>

        <footer className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-white px-5 py-4 dark:border-[#2d2e30] dark:bg-[#141517] sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 w-full cursor-pointer rounded-md px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 disabled:cursor-default disabled:opacity-60 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white sm:w-auto"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={Boolean(emailError) || !roleId || isSubmitting}
            onClick={() => {
              void handleSubmit();
            }}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-4 text-sm font-semibold text-white hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            Générer l'invitation
          </button>
        </footer>
      </aside>
    </div>
  );
}

function InvitationLinkPanel({
  invitationUrl,
  onCopied,
  onDismiss,
}: {
  invitationUrl: string | null;
  onCopied: () => void;
  onDismiss: () => void;
}) {
  if (!invitationUrl) {
    return null;
  }

  async function copyInvitationUrl() {
    await navigator.clipboard.writeText(invitationUrl ?? "");
    onCopied();
  }

  return (
    <section className="rounded-lg border border-[#f44336]/25 bg-[#fff5f2] px-4 py-3 dark:border-[#ff8a3d]/25 dark:bg-[#201613]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-950 dark:text-white">
            Lien d'invitation généré
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Lien prêt à copier pour ouvrir la page d'acceptation.
          </p>
          <div className="mt-2 flex min-w-0 items-center rounded-md border border-[#f44336]/15 bg-white dark:border-[#ff8a3d]/20 dark:bg-[#141517]">
            <p className="min-w-0 flex-1 truncate px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-300">
              {invitationUrl}
            </p>
            <button
              type="button"
              onClick={() => {
                void copyInvitationUrl();
              }}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-stone-500 hover:bg-red-50 hover:text-[#f44336] dark:text-stone-400 dark:hover:bg-[#201613] dark:hover:text-[#ff8a3d]"
              aria-label="Copier le lien d'invitation"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex shrink-0 justify-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="h-10 cursor-pointer rounded-md px-3 text-sm font-medium text-stone-500 hover:bg-white hover:text-stone-950 dark:text-stone-400 dark:hover:bg-[#141517] dark:hover:text-white"
          >
            Masquer
          </button>
        </div>
      </div>
    </section>
  );
}

function InvitationsPanel({
  cancellingInvitationId,
  generatedInvitationLink,
  hasFilteredInvitations,
  hasInvitations,
  invitations,
  isLoading,
  onCancelInvitation,
  onDismissInvitationLink,
  onInvitationLinkCopied,
  onShowInvitation,
  regeneratingInvitationId,
}: {
  cancellingInvitationId: string | null;
  generatedInvitationLink: GeneratedInvitationLink | null;
  hasFilteredInvitations: boolean;
  hasInvitations: boolean;
  invitations: SiteInvitation[];
  isLoading: boolean;
  onCancelInvitation: (invitation: SiteInvitation) => void;
  onDismissInvitationLink: (invitationId: string) => void;
  onInvitationLinkCopied: () => void;
  onShowInvitation: (invitation: SiteInvitation) => void;
  regeneratingInvitationId: string | null;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#141517]">
      {isLoading ? (
        <p className="px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
          Chargement...
        </p>
      ) : null}
      {!isLoading && !hasInvitations ? (
        <p className="px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
          Aucune invitation pour ce site.
        </p>
      ) : null}
      {!isLoading && hasInvitations && !hasFilteredInvitations ? (
        <p className="px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
          Aucune invitation ne correspond aux filtres.
        </p>
      ) : null}
      {!isLoading && invitations.length > 0 ? (
        <div className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
          {invitations.map((invitation) => {
            const isCancelling = cancellingInvitationId === invitation.id;
            const isRegenerating = regeneratingInvitationId === invitation.id;
            const canShowInvitation = invitation.status === "pending";
            const canCancel = invitation.status === "pending";

            return (
              <div key={invitation.id}>
                <div className="invitations-row-grid grid gap-3 px-4 py-4 sm:grid-cols-2 lg:items-center">
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1 lg:w-full lg:justify-self-stretch">
                  <p className="truncate font-semibold text-stone-950 dark:text-white">
                    {invitation.email}
                  </p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-500">
                      Invité le {formatDateTime(invitation.created_at)}
                  </p>
                </div>
                <div className="invitation-row-cell rounded-lg bg-stone-50 px-3 py-2 dark:bg-[#111213] lg:flex lg:w-full lg:items-center lg:justify-center lg:bg-transparent lg:px-0 lg:py-0 lg:text-center lg:dark:bg-transparent">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 lg:hidden">
                    Role
                  </p>
                  <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    {invitation.roles ? getRoleDisplayLabel(invitation.roles) : "-"}
                  </span>
                </div>
                <div className="invitation-row-cell rounded-lg bg-stone-50 px-3 py-2 dark:bg-[#111213] lg:flex lg:w-full lg:items-center lg:justify-center lg:bg-transparent lg:px-0 lg:py-0 lg:text-center lg:dark:bg-transparent">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 lg:hidden">
                    Statut
                  </p>
                  <InvitationStatusBadge status={invitation.status} />
                </div>
                <div className="invitation-row-cell rounded-lg bg-stone-50 px-3 py-2 dark:bg-[#111213] sm:col-span-2 lg:col-span-1 lg:flex lg:w-full lg:items-center lg:justify-center lg:bg-transparent lg:px-0 lg:py-0 lg:text-center lg:dark:bg-transparent">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 lg:hidden">
                    Suivi
                  </p>
                  <span className="text-sm text-stone-500 dark:text-stone-400">
                    {getInvitationTimelineLabel(invitation)}
                  </span>
                </div>
                  <div className="invitation-row-actions flex min-w-0 flex-wrap justify-start gap-2 sm:col-span-2 lg:col-span-1 lg:w-full">
                  {canShowInvitation ? (
                    <button
                      type="button"
                      onClick={() => onShowInvitation(invitation)}
                      disabled={isRegenerating || isCancelling}
                      className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-950 disabled:cursor-default disabled:opacity-60 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white sm:flex-none"
                    >
                      {isRegenerating ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                          <RefreshCw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                      )}
                      Régénérer
                    </button>
                  ) : null}
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => onCancelInvitation(invitation)}
                      disabled={isRegenerating || isCancelling}
                      className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-[#f44336] hover:bg-red-100 disabled:cursor-default disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20 sm:flex-none"
                    >
                      Annuler
                    </button>
                  ) : null}
                  {!canShowInvitation && !canCancel ? (
                      <span className="inline-flex h-9 w-full items-center justify-center text-xs font-medium text-stone-400 dark:text-stone-500">
                        Aucune action
                      </span>
                  ) : null}
                  </div>
                </div>
                {generatedInvitationLink?.invitationId === invitation.id ? (
                  <div className="px-4 pb-4">
                    <InvitationLinkPanel
                      invitationUrl={generatedInvitationLink.url}
                      onDismiss={() => onDismissInvitationLink(invitation.id)}
                      onCopied={onInvitationLinkCopied}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
function InvitationStatusBadge({ status }: { status: SiteInvitationStatus }) {
  const styles: Record<SiteInvitationStatus, string> = {
    accepted:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    cancelled:
      "border-stone-200 bg-stone-100 text-stone-600 dark:border-[#2d2e30] dark:bg-[#24262a] dark:text-stone-300",
    expired:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    pending:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  };

  return (
    <span
      className={[
        "inline-flex h-7 w-fit items-center rounded-full border px-2.5 text-xs font-bold",
        styles[status],
      ].join(" ")}
    >
      {getInvitationStatusLabel(status)}
    </span>
  );
}

function MemberAvatar({ member }: { member: SiteMember }) {
  const initials = getMemberInitials(member);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-xs font-bold text-stone-600 dark:border-[#2d2e30] dark:bg-[#24262a] dark:text-stone-200">
      {member.profiles?.avatarDisplayUrl ? (
        <img
          src={member.profiles.avatarDisplayUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function PaginationControls({
  className,
  currentPage,
  totalPages,
  onPageChange,
}: {
  className?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div
      className={[
        "flex flex-nowrap items-center justify-center gap-1 py-1 text-[11px] text-stone-600 dark:text-stone-300 sm:gap-2 sm:text-sm",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex h-9 items-center gap-1 rounded-full bg-stone-100 px-0.5 dark:bg-[#111213] sm:h-11 sm:gap-3">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border sm:h-10 sm:w-10 border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-100 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-300 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#1c1d20] dark:disabled:bg-[#24262a] dark:disabled:text-stone-600"
          aria-label="Page precedente"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-11 text-center text-[11px] font-semibold tabular-nums sm:w-16 sm:text-sm text-stone-700 dark:text-stone-200">
          {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border sm:h-10 sm:w-10 border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-100 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-300 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#1c1d20] dark:disabled:bg-[#24262a] dark:disabled:text-stone-600"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ItemsPerPageControl({
  itemsPerPage,
  onItemsPerPageChange,
}: {
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}) {
  return (
    <SelectDropdown
      ariaLabel="Nombre d'utilisateurs par page"
      className="w-[104px] sm:w-[132px]"
      options={ITEMS_PER_PAGE_OPTIONS.map((option) => ({
        id: String(option),
        label: `${option}/p`,
      }))}
      value={String(itemsPerPage)}
      onChange={(value) => onItemsPerPageChange(Number(value))}
    />
  );
}

function getMemberDisplayName(member: SiteMember) {
  return (
    [member.profiles?.first_name, member.profiles?.last_name]
      .filter(Boolean)
      .join(" ") ||
    member.email ||
    member.user_id
  );
}

function getMemberInitials(member: SiteMember) {
  const source = getMemberDisplayName(member);
  const parts = source.split(/[ @._-]/).filter(Boolean);
  const firstInitial = parts[0]?.[0] ?? "U";
  const secondInitial = parts[1]?.[0] ?? "";

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

function getRoleDisplayLabel(role: Role) {
  return isAdminRoleCode(role.code) ? "Admin" : role.label;
}

function isAdminRoleCode(code: string | null | undefined) {
  return code?.toUpperCase() === "ADMIN";
}

function getInviteEmailError(email: string) {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return "Email obligatoire.";
  }

  if (
    normalizedEmail.includes(" ") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return "Email invalide.";
  }

  return null;
}

function getInvitationStatusLabel(status: SiteInvitationStatus) {
  const labels: Record<SiteInvitationStatus, string> = {
    accepted: "Acceptée",
    cancelled: "Annulée",
    expired: "Expirée",
    pending: "En cours",
  };

  return labels[status];
}

function getInvitationTimelineLabel(invitation: SiteInvitation) {
  if (invitation.status === "accepted" && invitation.accepted_at) {
    return `Acceptée le ${formatDate(invitation.accepted_at)}`;
  }

  return `Expire le ${formatDate(invitation.expires_at)}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
