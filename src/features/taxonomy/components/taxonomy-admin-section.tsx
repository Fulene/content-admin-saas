"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { IconButtonTooltip } from "@/components/feedback/icon-button-tooltip";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import {
  createCategory,
  deleteCategoryForSite,
  getArticlesUsingCategory,
  getCategories,
  updateCategory,
} from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/category";
import { useActiveSite } from "@/features/sites/components/active-site-provider";
import {
  createTag,
  deleteTagForSite,
  getTags,
  updateTag,
} from "@/features/tags/services/tags.service";
import type { Tag } from "@/features/tags/types/tag";

type TaxonomyMode = "categories" | "tags";
type Item = Category | Tag;
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50] as const;

export function TaxonomyAdminSection({
  canManageContent,
  mode,
}: {
  canManageContent: boolean;
  mode: TaxonomyMode;
}) {
  const { activeSiteId } = useActiveSite();
  const [items, setItems] = useState<Item[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<ToastMessageState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [name, setName] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    item: Item;
    articleTitles: string[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isCategories = mode === "categories";
  const title = isCategories ? "Categories" : "Tags";
  const emptyLabel = isCategories
    ? "Aucune categorie disponible."
    : "Aucun tag disponible.";

  useEffect(() => {
    void loadItems();
  }, [activeSiteId, mode]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return [item.name, item.slug]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .toSorted((firstItem, secondItem) => {
        const comparison = firstItem.name.localeCompare(secondItem.name);

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [items, searchQuery, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredItems, itemsPerPage]);
  const shouldShowPaginationControls = filteredItems.length >= 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSiteId, itemsPerPage, mode, searchQuery, sortDirection]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!canManageContent) {
      resetForm();
      setPendingDelete(null);
    }
  }, [canManageContent]);

  async function loadItems() {
    setLoadState("loading");
    setMessage(null);
    resetForm();

    try {
      const data = isCategories
        ? await getCategories(activeSiteId)
        : await getTags(activeSiteId);
      setItems(data);
      setLoadState("success");
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de charger les donnees.",
      });
      setLoadState("error");
    }
  }

  async function handleSave() {
    if (!canManageContent) {
      return;
    }

    const trimmedName = name.trim();
    const normalizedName = isCategories ? trimmedName : trimmedName.toLowerCase();
    const slug = slugify(normalizedName);

    if (!normalizedName || !slug) {
      setMessage({ status: "error", text: "Nom invalide." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const savedItem = editingItem
        ? isCategories
          ? await updateCategory({
              id: editingItem.id,
              siteId: activeSiteId,
              name: normalizedName,
              slug,
            })
          : await updateTag({
              id: editingItem.id,
              siteId: activeSiteId,
              name: normalizedName,
              slug,
            })
        : isCategories
          ? await createCategory({
              siteId: activeSiteId,
              name: normalizedName,
              slug,
            })
          : await createTag({
              siteId: activeSiteId,
              name: normalizedName,
              slug,
            });

      setItems((currentItems) => {
        if (!editingItem) {
          return [...currentItems, savedItem];
        }

        return currentItems.map((item) =>
          item.id === savedItem.id ? savedItem : item,
        );
      });
      resetForm();
      setMessage({
        status: "success",
        text: editingItem
          ? "Element modifie avec succes."
          : "Element ajoute avec succes.",
      });
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer l'element.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function requestDelete(item: Item) {
    if (!canManageContent) {
      return;
    }

    if (!isCategories) {
      setPendingDelete({ item, articleTitles: [] });
      return;
    }

    try {
      const articles = await getArticlesUsingCategory({
        siteId: activeSiteId,
        categoryId: item.id,
      });
      setPendingDelete({
        item,
        articleTitles: articles.map((article) => article.title),
      });
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de verifier les articles lies.",
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !canManageContent) {
      return;
    }

    try {
      if (isCategories) {
        await deleteCategoryForSite({
          siteId: activeSiteId,
          id: pendingDelete.item.id,
        });
      } else {
        await deleteTagForSite({
          siteId: activeSiteId,
          id: pendingDelete.item.id,
        });
      }

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== pendingDelete.item.id),
      );
      setPendingDelete(null);
      resetForm();
      setMessage({ status: "success", text: "Element supprime avec succes." });
    } catch (error) {
      setMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l'element.",
      });
    }
  }

  function openCreateForm() {
    if (!canManageContent) {
      return;
    }

    setEditingItem(null);
    setName("");
    setIsFormOpen(true);
    setMessage(null);
  }

  function openEditForm(item: Item) {
    if (!canManageContent) {
      return;
    }

    setEditingItem(item);
    setName(item.name);
    setIsFormOpen(true);
    setMessage(null);
  }

  function resetForm() {
    setEditingItem(null);
    setName("");
    setIsFormOpen(false);
  }

  return (
    <section className="flex min-h-full flex-col gap-5">
      <ToastMessage message={message} onClose={() => setMessage(null)} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
          Taxonomie
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-950 dark:text-white">
          {title}
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
            placeholder={
              isCategories
                ? "Rechercher une categorie"
                : "Rechercher un tag"
            }
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
            {filteredItems.length} element
            {filteredItems.length > 1 ? "s" : ""} au total
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {(["asc", "desc"] as const).map((direction) => {
            const isActive = sortDirection === direction;

            return (
              <button
                key={direction}
                type="button"
                onClick={() => setSortDirection(direction)}
                className={[
                  "h-9 cursor-pointer rounded-md border px-3 text-xs font-medium transition-colors sm:h-10 sm:px-4 sm:text-sm",
                  isActive
                    ? "border-[#f44336] bg-red-50 text-stone-950 dark:border-[#ff8a3d] dark:bg-[#24262a] dark:text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                ].join(" ")}
              >
                {direction === "asc" ? "A-Z" : "Z-A"}
              </button>
            );
          })}
          {canManageContent ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="admin-data-toolbar-action group relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[#f44336] text-sm font-semibold text-white transition-[width,background-color] duration-200 ease-out hover:w-[132px] hover:bg-[#d7382d] focus-visible:w-[132px] focus-visible:bg-[#d7382d] dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] dark:focus-visible:bg-[#ff7920]"
              aria-label={isCategories ? "Nouvelle categorie" : "Nouveau tag"}
            >
              <span className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap pl-8 pr-3 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
                Ajouter
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {canManageContent && isFormOpen ? (
        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-[#2d2e30] dark:bg-[#141517] sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();
                void handleSave();
              }}
              placeholder={isCategories ? "Nom de categorie" : "Nom du tag"}
              className="h-11 min-w-0 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-4 text-sm font-semibold text-white hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] sm:w-auto"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : editingItem ? (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {editingItem ? "Enregistrer" : "Ajouter"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md border border-stone-200 px-3 text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white sm:w-11"
              aria-label="Annuler l'edition"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#141517]">
        {loadState === "loading" ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            Chargement...
          </p>
        ) : null}
        {loadState === "error" ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            Chargement impossible.
          </p>
        ) : null}
        {loadState === "success" && items.length === 0 ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            {emptyLabel}
          </p>
        ) : null}
        {loadState === "success" &&
        items.length > 0 &&
        filteredItems.length === 0 ? (
          <p className="p-6 text-sm text-stone-500 dark:text-stone-400">
            Aucun resultat.
          </p>
        ) : null}
        {loadState === "success" && paginatedItems.length > 0 ? (
          <div className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
            {paginatedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-950 dark:text-white">
                    {item.name}
                  </p>
                </div>
                {canManageContent ? (
                  <div className="flex shrink-0 gap-2">
                    <IconButtonTooltip
                      label={`Modifier ${item.name}`}
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white"
                      aria-label={`Modifier ${item.name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </IconButtonTooltip>
                    <IconButtonTooltip
                      label={`Supprimer ${item.name}`}
                      type="button"
                      onClick={() => void requestDelete(item)}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-red-50 text-[#f44336] hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      aria-label={`Supprimer ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButtonTooltip>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {loadState === "success" &&
      filteredItems.length > 0 &&
      shouldShowPaginationControls ? (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          className="mb-4 justify-center"
          onPageChange={setCurrentPage}
        />
      ) : null}

      {canManageContent ? (
        <ConfirmDialog
          cancelLabel="Annuler"
          confirmLabel="Supprimer"
          isDanger
          isOpen={Boolean(pendingDelete)}
          title={`Supprimer ${pendingDelete?.item.name ?? ""} ?`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        >
          {pendingDelete?.articleTitles.length ? (
            <>
              <p>
                Cette categorie est utilisee par les articles suivants. Ils seront
                conserves mais leur categorie sera retiree :
              </p>
              <ul className="mt-3 max-h-40 list-disc overflow-y-auto pl-5">
                {pendingDelete.articleTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Cette action est definitive.</p>
          )}
        </ConfirmDialog>
      ) : null}
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
      ariaLabel="Nombre d'elements par page"
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
