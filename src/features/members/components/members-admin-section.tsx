"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import {
  getRoles,
  getSiteMembers,
  removeSiteMember,
  updateSiteMemberRole,
} from "@/features/members/services/members.service";
import type { Role, SiteMember } from "@/features/members/types/member";
import { useActiveSite } from "@/features/sites/components/active-site-provider";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50] as const;
const ROLE_ORDER_BY_CODE: Record<string, number> = {
  OWNER: 0,
  EDITOR: 1,
  VIEWER: 2,
};

export function MembersAdminSection({ currentUserId }: { currentUserId: string }) {
  const { activeSiteId } = useActiveSite();
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [message, setMessage] = useState<ToastMessageState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    () => orderedRoles.map((role) => ({ id: role.id, label: role.label })),
    [orderedRoles],
  );
  const ownerRoleId = useMemo(
    () => roles.find((role) => role.code === "OWNER")?.id ?? null,
    [roles],
  );
  const ownerCount = useMemo(
    () =>
      ownerRoleId
        ? members.filter((member) => member.role_id === ownerRoleId).length
        : 0,
    [members, ownerRoleId],
  );
  const roleFilters = useMemo(
    () => [
      { id: "all", label: "Tous" },
      ...orderedRoles.map((role) => ({
        id: role.id,
        label: role.label,
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
          member.roles?.label,
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSiteId, itemsPerPage, roleFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function loadData() {
    setIsLoading(true);
    setMessage(null);

    try {
      const [memberData, roleData] = await Promise.all([
        getSiteMembers(activeSiteId),
        getRoles(),
      ]);
      setMembers(memberData);
      setRoles(roleData);
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
    if (
      ownerRoleId &&
      member.role_id === ownerRoleId &&
      nextRoleId !== ownerRoleId &&
      ownerCount <= 1
    ) {
      setMessage({
        status: "error",
        text: "Impossible de modifier le role du dernier owner du site.",
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

  return (
    <section className="flex min-h-full flex-col gap-5">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
          Acces
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-950 dark:text-white">
          Utilisateurs et roles
        </h1>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative min-w-0 lg:max-w-sm lg:flex-1">
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

        <div className="flex flex-wrap items-center gap-3 lg:justify-center">
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

        <div className="flex flex-wrap items-center gap-2 xl:w-[464px] xl:justify-end">
          {roleFilters.map((filter) => {
            const isActive = roleFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setRoleFilter(filter.id)}
                className={[
                  "h-10 cursor-pointer rounded-md border px-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-[#f44336] bg-red-50 text-stone-950 dark:border-[#ff8a3d] dark:bg-[#24262a] dark:text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          })}
          <span title="soon" className="inline-flex">
            <button
              type="button"
              disabled
              className="group inline-flex h-11 w-11 shrink-0 cursor-default items-center overflow-hidden rounded-full bg-[#f44336] text-sm font-semibold text-white opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950"
              aria-label="Ajouter un utilisateur"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#141517]">
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
              const isCurrentUser = member.user_id === currentUserId;
              const isOwner = ownerRoleId
                ? member.role_id === ownerRoleId
                : false;
              const isLastOwner = isOwner && ownerCount <= 1;

              return (
                <div
                  key={member.user_id}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_180px_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-950 dark:text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-500">
                      {member.user_id}
                    </p>
                  </div>
                  <SelectDropdown
                    ariaLabel={`Role de ${displayName}`}
                    options={roleOptions}
                    value={member.role_id}
                    onChange={(nextRoleId) =>
                      void handleRoleChange(member, nextRoleId)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setPendingRemoval(member)}
                    disabled={isCurrentUser || isLastOwner}
                    title={
                      isLastOwner
                        ? "Impossible de retirer le dernier owner"
                        : undefined
                    }
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-[#f44336] hover:bg-red-100 disabled:cursor-default disabled:opacity-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Retirer
                  </button>
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
    </section>
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
        "flex flex-wrap items-center gap-3 py-1 text-sm text-stone-600 dark:text-stone-300",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex h-11 items-center gap-3 rounded-full bg-stone-100 px-0.5 dark:bg-[#111213]">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-100 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-300 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#1c1d20] dark:disabled:bg-[#24262a] dark:disabled:text-stone-600"
          aria-label="Page precedente"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200">
          {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-100 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-300 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#1c1d20] dark:disabled:bg-[#24262a] dark:disabled:text-stone-600"
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
      className="w-[132px]"
      options={ITEMS_PER_PAGE_OPTIONS.map((option) => ({
        id: String(option),
        label: `${option} / page`,
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
      .join(" ") || member.user_id
  );
}
