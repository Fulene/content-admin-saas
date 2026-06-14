"use client";

import {
  type AnimationEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { IconButtonTooltip } from "@/components/feedback/icon-button-tooltip";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import {
  createManagedSiteAction,
  deleteManagedSiteAction,
  getManagedSitesAction,
  updateManagedSiteAction,
  updateManagedSiteStatusAction,
} from "@/features/sites/actions/sites-management.actions";
import type {
  ManagedSite,
  Site,
  SiteStatus,
} from "@/features/sites/types/site";

type LoadState = "idle" | "loading" | "success" | "error";
type DrawerMode = "create" | "edit";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50] as const;

export function SitesManagementSection({
  onOpenSite,
  onSitesChange,
}: {
  onOpenSite: (siteId: string) => void;
  onSitesChange: (sites: Site[]) => void;
}) {
  const [sites, setSites] = useState<ManagedSite[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [message, setMessage] = useState<ToastMessageState | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editedSite, setEditedSite] = useState<ManagedSite | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<ManagedSite | null>(null);
  const [isDeletingSite, setIsDeletingSite] = useState(false);
  const [pendingStatusSiteId, setPendingStatusSiteId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadSites();
  }, []);

  const filteredSites = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sites
      .filter((site) => {
        const searchableText = [
          site.name,
          site.id,
          site.slug,
          getSiteStatusLabel(site.status),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          normalizedQuery.length === 0 ||
          searchableText.includes(normalizedQuery)
        );
      })
      .toSorted((firstSite, secondSite) =>
        firstSite.name.localeCompare(secondSite.name),
      );
  }, [searchQuery, sites]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSites.length / itemsPerPage),
  );
  const shouldShowPaginationControls = filteredSites.length >= 6;
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredSites.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredSites, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function loadSites() {
    setLoadState("loading");
    setMessage(null);

    try {
      const data = await getManagedSitesAction();
      setManagedSites(data);
      setLoadState("success");
    } catch (error) {
      setLoadState("error");
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de charger les sites.",
      });
    }
  }

  function setManagedSites(nextSites: ManagedSite[]) {
    setSites(nextSites);
    onSitesChange(toShellSites(nextSites));
  }

  function openCreateDrawer() {
    setDrawerMode("create");
    setEditedSite(null);
    setIsDrawerOpen(true);
  }

  function openEditDrawer(site: ManagedSite) {
    setDrawerMode("edit");
    setEditedSite(site);
    setIsDrawerOpen(true);
  }

  async function handleSubmitSite(name: string) {
    const result =
      drawerMode === "create"
        ? await createManagedSiteAction({ name })
        : editedSite
          ? await updateManagedSiteAction({ name, siteId: editedSite.id })
          : {
              status: "error" as const,
              text: "Aucun site selectionne.",
            };

    setMessage({ status: result.status, text: result.text });

    if (result.status === "success" && result.site) {
      const savedSite = result.site;
      const nextSites =
        drawerMode === "create"
          ? [...sites, savedSite]
          : sites.map((site) =>
              site.id === savedSite.id ? savedSite : site,
            );

      setManagedSites(nextSites);
      setIsDrawerOpen(false);
      setEditedSite(null);
    }
  }

  async function handleToggleStatus(site: ManagedSite) {
    const nextStatus: SiteStatus =
      site.status === "active" ? "disabled" : "active";

    setPendingStatusSiteId(site.id);
    setMessage(null);

    try {
      const result = await updateManagedSiteStatusAction({
        siteId: site.id,
        status: nextStatus,
      });

      setMessage({ status: result.status, text: result.text });

      if (result.status === "success" && result.site) {
        const updatedSite = result.site;
        const nextSites = sites.map((currentSite) =>
          currentSite.id === updatedSite.id ? updatedSite : currentSite,
        );

        setManagedSites(nextSites);
      }
    } finally {
      setPendingStatusSiteId(null);
    }
  }

  async function handleDeleteSite() {
    if (!siteToDelete) {
      return;
    }

    setIsDeletingSite(true);
    setMessage(null);

    try {
      const result = await deleteManagedSiteAction({ siteId: siteToDelete.id });
      setMessage({ status: result.status, text: result.text });

      if (result.status === "success") {
        const nextSites = sites.filter((site) => site.id !== siteToDelete.id);

        setManagedSites(nextSites);
        setSiteToDelete(null);
      }
    } finally {
      setIsDeletingSite(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
          Super admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-950 dark:text-white">
          Gestion des sites
        </h1>
      </div>

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
            placeholder="Rechercher un site"
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
            {filteredSites.length} site
            {filteredSites.length > 1 ? "s" : ""} au total
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          <button
            type="button"
            onClick={openCreateDrawer}
            className="admin-data-toolbar-action group relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[#f44336] text-sm font-semibold text-white transition-[width,background-color] duration-200 ease-out hover:w-[156px] hover:bg-[#d7382d] focus-visible:w-[156px] focus-visible:bg-[#d7382d] dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] dark:focus-visible:bg-[#ff7920]"
            aria-label="Nouveau site"
          >
            <span className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap pl-8 pr-3 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
              Nouveau site
            </span>
          </button>
        </div>
      </div>

      <div className="flex rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#141517]">
        {loadState === "loading" || loadState === "idle" ? (
          <SitesLoadingState />
        ) : null}

        {loadState === "error" ? <SitesErrorState /> : null}

        {loadState === "success" && sites.length === 0 ? (
          <SitesEmptyState title="Aucun site" />
        ) : null}

        {loadState === "success" &&
        sites.length > 0 &&
        filteredSites.length === 0 ? (
          <SitesEmptyState title="Aucun resultat" />
        ) : null}

        {loadState === "success" && filteredSites.length > 0 ? (
          <SitesTable
            pendingStatusSiteId={pendingStatusSiteId}
            sites={paginatedSites}
            onDeleteSite={setSiteToDelete}
            onEditSite={openEditDrawer}
            onOpenSite={onOpenSite}
            onToggleStatus={(site) => {
              void handleToggleStatus(site);
            }}
          />
        ) : null}
      </div>

      {loadState === "success" &&
      filteredSites.length > 0 &&
      shouldShowPaginationControls ? (
        <PaginationControls
          className="mb-4 justify-center"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : null}

      <SiteFormDrawer
        initialName={editedSite?.name ?? ""}
        isOpen={isDrawerOpen}
        mode={drawerMode}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditedSite(null);
        }}
        onSubmit={handleSubmitSite}
      />

      <ConfirmDialog
        cancelLabel="Annuler"
        confirmLabel={isDeletingSite ? "Suppression..." : "Supprimer"}
        isDanger
        isOpen={Boolean(siteToDelete)}
        title="Supprimer ce site ?"
        onCancel={() => {
          if (!isDeletingSite) {
            setSiteToDelete(null);
          }
        }}
        onConfirm={() => {
          if (!isDeletingSite) {
            void handleDeleteSite();
          }
        }}
      >
        Cette action supprimera le site
        {siteToDelete ? ` "${siteToDelete.name}"` : ""}, ses articles,
        categories, tags, invitations et rattachements utilisateurs. Les comptes
        utilisateurs ne seront pas supprimes.
      </ConfirmDialog>
    </section>
  );
}

function SitesTable({
  pendingStatusSiteId,
  sites,
  onDeleteSite,
  onEditSite,
  onOpenSite,
  onToggleStatus,
}: {
  pendingStatusSiteId: string | null;
  sites: ManagedSite[];
  onDeleteSite: (site: ManagedSite) => void;
  onEditSite: (site: ManagedSite) => void;
  onOpenSite: (siteId: string) => void;
  onToggleStatus: (site: ManagedSite) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed border-collapse text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-500 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400">
          <tr>
            <th className="w-[48%] px-4 py-3">Site</th>
            <th className="w-[16%] px-4 py-3 text-center">Utilisateurs</th>
            <th className="w-[16%] px-4 py-3 text-center">Statut</th>
            <th className="w-[20%] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
          {sites.map((site) => (
            <tr key={site.id} className="text-stone-700 dark:text-stone-300">
              <td className="px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-950 dark:text-white">
                    {site.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-500">
                    {site.id}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4 text-center">
                <span className="font-semibold tabular-nums text-stone-950 dark:text-white">
                  {site.memberCount}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <SiteStatusBadge status={site.status} />
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <SiteActionButton
                    icon={ExternalLink}
                    label="Aller sur le site"
                    onClick={() => onOpenSite(site.id)}
                  />
                  <SiteActionButton
                    icon={Pencil}
                    label="Modifier"
                    onClick={() => onEditSite(site)}
                  />
                  <SiteActionButton
                    icon={
                      pendingStatusSiteId === site.id
                        ? Loader2
                        : site.status === "active"
                          ? Ban
                          : CheckCircle2
                    }
                    isLoading={pendingStatusSiteId === site.id}
                    label={
                      site.status === "active" ? "Désactiver" : "Réactiver"
                    }
                    onClick={() => onToggleStatus(site)}
                  />
                  <SiteActionButton
                    icon={Trash2}
                    isDanger
                    label="Supprimer"
                    onClick={() => onDeleteSite(site)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SiteFormDrawer({
  initialName,
  isOpen,
  mode,
  onClose,
  onSubmit,
}: {
  initialName: string;
  isOpen: boolean;
  mode: DrawerMode;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const trimmedName = name.trim();
  const nameError =
    trimmedName.length === 0
      ? "Nom obligatoire."
      : trimmedName.length < 2
        ? "2 caracteres minimum."
        : null;

  useEffect(() => {
    if (isOpen) {
      setIsDrawerMounted(true);
      setIsClosing(false);
      setName(initialName);
      setIsSubmitting(false);
      return;
    }

    if (isDrawerMounted) {
      setIsClosing(true);
    }
  }, [initialName, isDrawerMounted, isOpen]);

  if (!isDrawerMounted) {
    return null;
  }

  function requestClose() {
    if (isSubmitting || isClosing) {
      return;
    }

    onClose();
  }

  function handleDrawerAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || !isClosing) {
      return;
    }

    setIsDrawerMounted(false);
    setIsClosing(false);
    setIsSubmitting(false);
  }

  async function handleSubmit() {
    if (nameError || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(trimmedName);
    } finally {
      setIsSubmitting(false);
    }
  }

  const backdropAnimationClass = isClosing
    ? "article-create-drawer-backdrop-out"
    : "article-create-drawer-backdrop-in";
  const drawerAnimationClass = isClosing
    ? "article-create-drawer-out"
    : "article-create-drawer-in";

  return (
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-[100dvw] justify-end overflow-hidden overscroll-none">
      <button
        type="button"
        onClick={requestClose}
        className={`${backdropAnimationClass} absolute inset-0 cursor-pointer bg-black/35`}
        aria-label="Fermer le panneau"
      />

      <aside
        className={`${drawerAnimationClass} relative z-[1] grid h-[100dvh] max-h-[100dvh] w-full max-w-[100dvw] min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-l border-stone-200 bg-white shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517] lg:max-w-[520px]`}
        onAnimationEnd={handleDrawerAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-[#2d2e30]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
              Site
            </p>
            <h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">
              {mode === "create" ? "Ajouter un site" : "Modifier le site"}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#111213] dark:text-stone-300 dark:hover:bg-[#18191b]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  Nom du site <span className="text-[#f44336]">*</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nom du site"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "site-name-error" : undefined}
                  className={[
                    "h-11 rounded-md border bg-white px-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500",
                    nameError
                      ? "border-[#f44336] focus:border-[#f44336] dark:border-red-400 dark:focus:border-red-400"
                      : "border-stone-200 focus:border-stone-400 dark:border-[#2d2e30] dark:focus:border-[#ff8a3d]",
                  ].join(" ")}
                />
                {nameError ? (
                  <span
                    id="site-name-error"
                    className="text-xs font-medium text-[#f44336] dark:text-red-300"
                  >
                    {nameError}
                  </span>
                ) : null}
              </label>
            </div>
          </div>

          <footer className="flex min-w-0 shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-white px-5 py-4 dark:border-[#2d2e30] dark:bg-[#141517] sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="h-10 w-full cursor-pointer rounded-md px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 disabled:cursor-default disabled:opacity-60 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white sm:w-auto"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={Boolean(nameError) || isSubmitting}
              onClick={() => {
                void handleSubmit();
              }}
              className="inline-flex h-10 w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-4 text-sm font-semibold text-white hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function SiteStatusBadge({ status }: { status: SiteStatus }) {
  const isActive = status === "active";

  return (
    <span
      className={[
        "inline-flex h-7 w-fit items-center rounded-full border px-2.5 text-xs font-bold",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
      ].join(" ")}
    >
      {getSiteStatusLabel(status)}
    </span>
  );
}

function SiteActionButton({
  icon: Icon,
  isDanger = false,
  isLoading = false,
  label,
  onClick,
}: {
  icon: LucideIcon;
  isDanger?: boolean;
  isLoading?: boolean;
  label: string;
  onClick: () => void;
}) {
  const className = [
    "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border transition-colors disabled:cursor-default disabled:opacity-60",
    isDanger
      ? "border-red-200 bg-red-50 text-[#f44336] hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
      : "border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400 dark:hover:bg-[#18191b] dark:hover:text-white",
  ].join(" ");

  if (isDanger) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={className}
        aria-label={label}
      >
        <Icon
          className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <IconButtonTooltip
      label={label}
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={className}
    >
      <Icon
        className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </IconButtonTooltip>
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
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-100 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-300 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#1c1d20] dark:disabled:bg-[#24262a] dark:disabled:text-stone-600 sm:h-10 sm:w-10"
          aria-label="Page precedente"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-11 text-center text-[11px] font-semibold tabular-nums text-stone-700 dark:text-stone-200 sm:w-16 sm:text-sm">
          {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-100 disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-300 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#1c1d20] dark:disabled:bg-[#24262a] dark:disabled:text-stone-600 sm:h-10 sm:w-10"
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
      ariaLabel="Nombre de sites par page"
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

function SitesLoadingState() {
  return (
    <div className="flex w-full flex-col gap-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-md bg-stone-100 dark:bg-[#111213]"
        />
      ))}
    </div>
  );
}

function SitesErrorState() {
  return (
    <div className="flex w-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-base font-semibold text-stone-950 dark:text-white">
          Impossible de charger les sites
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Le detail de l'erreur est affiche dans le toast.
        </p>
      </div>
    </div>
  );
}

function SitesEmptyState({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-base font-semibold text-stone-950 dark:text-white">
          {title}
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Les sites apparaissent ici lorsque Supabase retourne des donnees.
        </p>
      </div>
    </div>
  );
}

function toShellSites(sites: ManagedSite[]): Site[] {
  return sites.map(({ memberCount: _memberCount, ...site }) => site);
}

function getSiteStatusLabel(status: SiteStatus) {
  return status === "active" ? "Actif" : "Désactivé";
}
