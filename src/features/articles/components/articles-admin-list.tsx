"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import { ArticleCreateDrawer } from "@/features/articles/components/article-create-drawer";
import { ArticleDetailsDialog } from "@/features/articles/components/article-details-dialog";
import {
  ArticleEditDrawer,
  type ArticleEditFocusTarget,
} from "@/features/articles/components/article-edit-drawer";
import { ArticleImageDialog } from "@/features/articles/components/article-image-dialog";
import { ArticleImagePreviewLabel } from "@/features/articles/components/article-image-preview-label";
import {
  deleteArticleForSite,
  getArticles,
  getArticleTagsByArticleIds,
  updateArticleStatus,
} from "@/features/articles/services/articles.service";
import type {
  Article,
  ArticleStatus,
  ArticleStatusFilter,
} from "@/features/articles/types/article";
import { getCategories } from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/category";
import { useActiveSite } from "@/features/sites/components/active-site-provider";
import type { Tag } from "@/features/tags/types/tag";

type LoadState = "idle" | "loading" | "success" | "error";
type SortColumn =
  | "title"
  | "summary"
  | "category"
  | "tags"
  | "status"
  | "published_at"
  | "seo"
  | "image"
  | "updated_at";
type SortDirection = "asc" | "desc";
type ActiveSortState = {
  column: SortColumn;
  direction: SortDirection;
};
type SortState = ActiveSortState | null;

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50] as const;

const statusFilters: Array<{
  label: string;
  value: ArticleStatusFilter;
}> = [
  { label: "Tous", value: "all" },
  { label: "Publiés", value: "published" },
  { label: "Brouillons", value: "draft" },
];

const statusLabels: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
};

export function ArticlesAdminList() {
  const { activeSiteId } = useActiveSite();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articleTagsById, setArticleTagsById] = useState<Map<string, Tag[]>>(
    () => new Map(),
  );
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArticleStatusFilter>("all");
  const [sortState, setSortState] = useState<SortState>({
    column: "updated_at",
    direction: "desc",
  });
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessageState | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [viewedArticle, setViewedArticle] = useState<Article | null>(null);
  const [editedArticle, setEditedArticle] = useState<Article | null>(null);
  const [editFocusTarget, setEditFocusTarget] =
    useState<ArticleEditFocusTarget | null>(null);
  const [imagePreviewArticle, setImagePreviewArticle] =
    useState<Article | null>(null);
  const [articleDetailsReturnId, setArticleDetailsReturnId] = useState<
    string | null
  >(null);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadArticles() {
      setLoadState("loading");

      try {
        const [articleData, categoryData] = await Promise.all([
          getArticles(activeSiteId),
          getCategories(activeSiteId),
        ]);
        const articleTags = await getArticleTagsByArticleIds({
          articleIds: articleData.map((article) => article.id),
          siteId: activeSiteId,
        });

        if (!isMounted) {
          return;
        }

        setArticles(articleData);
        setCategories(categoryData);
        setArticleTagsById(articleTags);
        setLoadState("success");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setToastMessage({
          status: "error",
          text:
            error instanceof Error
              ? error.message
              : "Impossible de charger les articles.",
        });
        setLoadState("error");
      }
    }

    void loadArticles();

    return () => {
      isMounted = false;
    };
  }, [activeSiteId, reloadKey]);

  const categoryNameById = useMemo(
    () =>
      new Map(
        categories.map((category) => [category.id, category.name] as const),
      ),
    [categories],
  );

  const filteredArticles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return articles
      .filter((article) => {
        const matchesStatus =
          statusFilter === "all" || article.status === statusFilter;

        const searchableText = [
          article.title,
          article.slug,
          article.summary,
          article.content,
          article.meta_title,
          article.meta_description,
          article.category_id ? categoryNameById.get(article.category_id) : null,
          getArticleTagsLabel(article, articleTagsById),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          normalizedQuery.length === 0 ||
          searchableText.includes(normalizedQuery);

        return matchesStatus && matchesSearch;
      })
      .toSorted((firstArticle, secondArticle) =>
        sortState
          ? compareArticles(
              firstArticle,
              secondArticle,
              sortState,
              categoryNameById,
              articleTagsById,
            )
          : 0,
      );
  }, [
    articleTagsById,
    articles,
    categoryNameById,
    searchQuery,
    sortState,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredArticles.length / itemsPerPage),
  );
  const shouldShowPaginationControls = filteredArticles.length >= 6;

  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredArticles.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredArticles, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSiteId, itemsPerPage, searchQuery, sortState, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function handleSort(column: SortColumn) {
    setSortState((currentSort) => {
      if (!currentSort || currentSort.column !== column) {
        return {
          column,
          direction: "asc",
        };
      }

      if (currentSort.direction === "asc") {
        return {
          column,
          direction: "desc",
        };
      }

      return null;
    });
  }

  async function handleDeleteArticle() {
    if (!articleToDelete) {
      return;
    }

    setIsDeletingArticle(true);
    setToastMessage(null);

    try {
      await deleteArticleForSite({
        article: articleToDelete,
        siteId: activeSiteId,
      });
      setArticleToDelete(null);
      setReloadKey((key) => key + 1);
      setToastMessage({
        status: "success",
        text: "Article supprimé avec succès.",
      });
    } catch (error) {
      setToastMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l'article.",
      });
    } finally {
      setIsDeletingArticle(false);
    }
  }

  async function handleToggleArticleStatus(article: Article) {
    const nextStatus = article.status === "published" ? "draft" : "published";

    setToastMessage(null);

    try {
      const updatedArticle = await updateArticleStatus({
        article,
        siteId: activeSiteId,
        status: nextStatus,
      });

      setArticles((currentArticles) =>
        currentArticles.map((currentArticle) =>
          currentArticle.id === updatedArticle.id ? updatedArticle : currentArticle,
        ),
      );
      setToastMessage({
        status: "success",
        text:
          nextStatus === "published"
            ? "Article publié avec succès."
            : "Article repasse en brouillon.",
      });
    } catch (error) {
      setToastMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le statut de l'article.",
      });
    }
  }

  return (
    <section className="flex min-h-full flex-col gap-5">
      <ToastMessage
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-sm">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un article"
              className="h-11 w-full rounded-md border border-stone-200 bg-white pl-10 pr-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-center">
          {shouldShowPaginationControls ? (
            <>
              <PaginationControls
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredArticles.length}
                totalPages={totalPages}
                onItemsPerPageChange={setItemsPerPage}
                onPageChange={setCurrentPage}
              />
              <ItemsPerPageControl
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </>
          ) : null}
          <span className="text-xs font-medium text-stone-500 dark:text-stone-500">
            {filteredArticles.length} article
            {filteredArticles.length > 1 ? "s" : ""} au total
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:w-[430px] xl:justify-end">
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
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
          <button
            type="button"
            onClick={() => setIsCreateDrawerOpen(true)}
            className="group inline-flex h-11 w-11 shrink-0 cursor-pointer items-center overflow-hidden rounded-full bg-[#f44336] text-sm font-semibold text-white transition-[width,background-color] duration-200 ease-out hover:w-39 hover:bg-[#d7382d] focus-visible:w-39 focus-visible:bg-[#d7382d] dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] dark:focus-visible:bg-[#ff7920]"
            aria-label="Nouvel article"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="-ml-1 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[width,opacity] duration-200 ease-out group-hover:w-25 group-hover:opacity-100 group-focus-visible:w-25 group-focus-visible:opacity-100">
              Nouvel article
            </span>
          </button>
        </div>
      </div>

      <div className="flex rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#141517]">
        {loadState === "loading" || loadState === "idle" ? (
          <ArticlesLoadingState />
        ) : null}

        {loadState === "error" ? (
          <ArticlesErrorState />
        ) : null}

        {loadState === "success" && articles.length === 0 ? (
          <ArticlesEmptyState title="Aucun article" />
        ) : null}

        {loadState === "success" &&
        articles.length > 0 &&
        filteredArticles.length === 0 ? (
          <ArticlesEmptyState title="Aucun resultat" />
        ) : null}

        {loadState === "success" && filteredArticles.length > 0 ? (
          <ArticlesTable
            articles={paginatedArticles}
            articleTagsById={articleTagsById}
            categoryNameById={categoryNameById}
            sortState={sortState}
            onDeleteArticle={setArticleToDelete}
            onEditArticle={(article) => {
              setEditFocusTarget(null);
              setEditedArticle(article);
            }}
            onPreviewImage={(article) => {
              setArticleDetailsReturnId(null);
              setImagePreviewArticle(article);
            }}
            onSort={handleSort}
            onToggleArticleStatus={(article) => {
              void handleToggleArticleStatus(article);
            }}
            onViewArticle={setViewedArticle}
          />
        ) : null}
      </div>

      {loadState === "success" &&
      filteredArticles.length > 0 &&
      shouldShowPaginationControls ? (
        <>
          <PaginationControls
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredArticles.length}
            totalPages={totalPages}
            className="mb-4 justify-center"
            onItemsPerPageChange={setItemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      ) : null}

      <ArticleCreateDrawer
        isOpen={isCreateDrawerOpen}
        onArticleCreated={(message) => {
          setReloadKey((key) => key + 1);
          setToastMessage(message);
        }}
        onClose={() => setIsCreateDrawerOpen(false)}
      />

      <ArticleDetailsDialog
        article={viewedArticle}
        categoryName={
          viewedArticle?.category_id
            ? categoryNameById.get(viewedArticle.category_id) ?? null
            : null
        }
        tags={
          viewedArticle ? (articleTagsById.get(viewedArticle.id) ?? []) : []
        }
        onPreviewImage={(article) => {
          setArticleDetailsReturnId(article.id);
          setImagePreviewArticle(article);
          setViewedArticle(null);
        }}
        onEditField={(field) => {
          if (!viewedArticle) {
            return;
          }

          setEditedArticle(viewedArticle);
          setEditFocusTarget(field);
          setViewedArticle(null);
        }}
        onClose={() => setViewedArticle(null)}
      />

      <ArticleEditDrawer
        article={editedArticle}
        articleTags={
          editedArticle ? (articleTagsById.get(editedArticle.id) ?? []) : []
        }
        focusTarget={editFocusTarget}
        isOpen={Boolean(editedArticle)}
        onArticleUpdated={(message) => {
          setReloadKey((key) => key + 1);
          setToastMessage(message);
        }}
        onClose={() => {
          setEditedArticle(null);
          setEditFocusTarget(null);
        }}
      />

      <ArticleImageDialog
        article={imagePreviewArticle}
        onClose={() => {
          const articleToReopen = articleDetailsReturnId
            ? (articles.find((article) => article.id === articleDetailsReturnId) ??
              imagePreviewArticle)
            : null;

          setImagePreviewArticle(null);
          setArticleDetailsReturnId(null);

          if (articleToReopen) {
            setViewedArticle(articleToReopen);
          }
        }}
      />

      <ConfirmDialog
        cancelLabel="Annuler"
        confirmLabel={isDeletingArticle ? "Suppression..." : "Supprimer"}
        isDanger
        isOpen={Boolean(articleToDelete)}
        title="Supprimer cet article ?"
        onCancel={() => {
          if (!isDeletingArticle) {
            setArticleToDelete(null);
          }
        }}
        onConfirm={() => {
          if (!isDeletingArticle) {
            void handleDeleteArticle();
          }
        }}
      >
        Cette action supprimera l'article
        {articleToDelete ? ` "${articleToDelete.title}"` : ""} et ses tags
        associés.
      </ConfirmDialog>
    </section>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  className,
  onPageChange,
}: {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  className?: string;
  onItemsPerPageChange: (itemsPerPage: number) => void;
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
      ariaLabel="Nombre d'articles par page"
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

function ArticlesTable({
  articles,
  articleTagsById,
  categoryNameById,
  sortState,
  onDeleteArticle,
  onEditArticle,
  onPreviewImage,
  onSort,
  onToggleArticleStatus,
  onViewArticle,
}: {
  articles: Article[];
  articleTagsById: Map<string, Tag[]>;
  categoryNameById: Map<string, string>;
  sortState: SortState;
  onDeleteArticle: (article: Article) => void;
  onEditArticle: (article: Article) => void;
  onPreviewImage: (article: Article) => void;
  onSort: (column: SortColumn) => void;
  onToggleArticleStatus: (article: Article) => void;
  onViewArticle: (article: Article) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1540px] table-fixed border-collapse text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-500 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400">
          <tr>
            <SortableTableHeader
              column="title"
              label="Titre"
              className="w-[22%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="summary"
              label="Résumé"
              className="w-[18%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="category"
              label="Catégorie"
              className="w-[10%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="tags"
              label="Tags"
              className="w-[12%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="status"
              label="Statut"
              className="w-[8%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="published_at"
              label="Publication"
              className="w-[10%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="seo"
              label="SEO"
              className="w-[9%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="image"
              label="Image"
              className="w-[7%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="updated_at"
              label="Modification"
              className="w-[9%]"
              sortState={sortState}
              onSort={onSort}
            />
            <th className="w-[10%] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
          {articles.map((article) => {
            const articleTags = articleTagsById.get(article.id) ?? [];

            return (
              <tr
                key={article.id}
                className="text-stone-700 dark:text-stone-300"
              >
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onViewArticle(article)}
                    className="group relative grid w-full cursor-pointer gap-1 rounded-md pr-24 text-left outline-none transition-colors hover:text-[#f44336] focus-visible:text-[#f44336] dark:hover:text-[#ff8a3d] dark:focus-visible:text-[#ff8a3d]"
                  >
                    <span className="font-semibold text-stone-950 transition-colors group-hover:text-[#f44336] group-focus-visible:text-[#f44336] dark:text-white dark:group-hover:text-[#ff8a3d] dark:group-focus-visible:text-[#ff8a3d]">
                      {article.title}
                    </span>
                    <SlugTooltip slug={article.slug} />
                    <span className="absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 opacity-0 shadow-sm transition-[opacity,color] group-hover:text-[#f44336] group-hover:opacity-100 group-focus-visible:text-[#f44336] group-focus-visible:opacity-100 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400 dark:group-hover:text-[#ff8a3d] dark:group-focus-visible:text-[#ff8a3d]">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">Voir l'article</span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-4">
                  <p className="line-clamp-2 text-sm text-stone-600 dark:text-stone-300">
                    {article.summary}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <EmptyValueFallback
                    value={
                      article.category_id
                        ? categoryNameById.get(article.category_id) ?? null
                        : null
                    }
                  />
                </td>
                <td className="px-4 py-4">
                  <ArticleTagsCell tags={articleTags} />
                </td>
                <td className="px-4 py-4">
                  <ArticleStatusBadge status={article.status} />
                </td>
                <td className="px-4 py-4">
                  {formatNullableDate(article.published_at)}
                </td>
                <td className="px-4 py-4">
                  <SeoStatus article={article} />
                </td>
                <td className="px-4 py-4">
                  <ImageCell
                    article={article}
                    onPreviewImage={onPreviewImage}
                  />
                </td>
                <td className="px-4 py-4">{formatDate(article.updated_at)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <StatusToggleButton
                      article={article}
                      onToggleArticleStatus={onToggleArticleStatus}
                    />
                    <ArticleActionButton
                      label="Modifier"
                      icon={Pencil}
                      onClick={() => onEditArticle(article)}
                    />
                    <ArticleActionButton
                      label="Supprimer"
                      icon={Trash2}
                      isDanger
                      onClick={() => onDeleteArticle(article)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortableTableHeader({
  column,
  label,
  className,
  sortState,
  onSort,
}: {
  column: SortColumn;
  label: string;
  className?: string;
  sortState: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = sortState?.column === column;
  const SortIcon = isActive
    ? sortState?.direction === "asc"
      ? ChevronUp
      : ChevronDown
    : ArrowUpDown;

  return (
    <th className={["px-4 py-3", className ?? ""].join(" ")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={[
          "inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-xs font-semibold uppercase transition-colors",
          isActive
            ? "text-stone-950 dark:text-white"
            : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-white",
        ].join(" ")}
        aria-label={`Trier par ${label}`}
      >
        <span>{label}</span>
        <SortIcon
          className={[
            "h-3.5 w-3.5",
            isActive ? "text-[#f44336] dark:text-[#ff8a3d]" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  const isPublished = status === "published";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
        isPublished
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
      ].join(" ")}
    >
      {statusLabels[status]}
    </span>
  );
}

function ArticleTagsCell({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return <EmptyValueFallback value={null} />;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag.id}
          className="rounded-full border border-[#ffc2b8] bg-[#ffe7e2] px-2 py-0.5 text-xs font-semibold text-[#9f2119] dark:border-[#7a3329] dark:bg-[#3a211c] dark:text-[#ffb199]"
        >
          {tag.name}
        </span>
      ))}
      {tags.length > 3 ? (
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500 dark:bg-[#24262a] dark:text-stone-400">
          +{tags.length - 3}
        </span>
      ) : null}
    </div>
  );
}

function SeoStatus({ article }: { article: Article }) {
  const hasMetaTitle = Boolean(article.meta_title?.trim());
  const hasMetaDescription = Boolean(article.meta_description?.trim());

  return (
    <div className="flex flex-wrap gap-1.5">
      <SeoBadge
        isDefined={hasMetaTitle}
        label="Title"
        tooltip={hasMetaTitle ? `Meta title : ${article.meta_title}` : null}
      />
      <SeoBadge
        isDefined={hasMetaDescription}
        label="Desc"
        tooltip={
          hasMetaDescription
            ? `Meta description : ${article.meta_description}`
            : null
        }
      />
    </div>
  );
}

function SeoBadge({
  isDefined,
  label,
  tooltip,
}: {
  isDefined: boolean;
  label: string;
  tooltip: string | null;
}) {
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    placement: "top" | "bottom";
    top: number;
  } | null>(null);

  function showTooltip() {
    if (!tooltip) {
      return;
    }

    const badgeElement = badgeRef.current;

    if (!badgeElement) {
      return;
    }

    const badgeRect = badgeElement.getBoundingClientRect();
    const tooltipWidth = 288;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(
        badgeRect.left + badgeRect.width / 2,
        viewportPadding + tooltipWidth / 2,
      ),
      window.innerWidth - viewportPadding - tooltipWidth / 2,
    );
    setTooltipPosition({
      left,
      placement: "top",
      top: badgeRect.top - 8,
    });
  }

  return (
    <>
      <span
        ref={badgeRef}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
        className={[
          "cursor-default rounded-full border px-2 py-0.5 text-xs font-semibold",
          isDefined
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-stone-200 bg-stone-50 text-stone-400 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-500",
        ].join(" ")}
      >
        {label}
      </span>

      {tooltipPosition
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[10001] w-72 rounded-lg border border-[#ffb199]/50 bg-[#2a1815] px-3 py-2 text-xs font-semibold text-[#ffe7e2] opacity-100 shadow-2xl shadow-black/30"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                transform:
                  tooltipPosition.placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              {tooltip}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

function SlugTooltip({ slug }: { slug: string }) {
  const slugRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  function showTooltip() {
    const slugElement = slugRef.current;

    if (!slugElement) {
      return;
    }

    if (slugElement.scrollWidth <= slugElement.clientWidth) {
      return;
    }

    const slugRect = slugElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(
        slugRect.left + slugRect.width / 2,
        viewportPadding + tooltipWidth / 2,
      ),
      window.innerWidth - viewportPadding - tooltipWidth / 2,
    );

    setTooltipPosition({
      left,
      top: slugRect.top - 8,
    });
  }

  return (
    <>
      <span
        ref={slugRef}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
        className="truncate text-xs text-stone-500 dark:text-stone-500"
      >
        /{slug}
      </span>

      {tooltipPosition
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[10001] max-w-80 rounded-lg border border-[#ffb199]/50 bg-[#2a1815] px-3 py-2 text-xs font-semibold text-[#ffe7e2] shadow-2xl shadow-black/30"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                transform: "translate(-50%, -100%)",
              }}
            >
              /{slug}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

function ImageCell({
  article,
  onPreviewImage,
}: {
  article: Article;
  onPreviewImage: (article: Article) => void;
}) {
  if (!article.cover_image_url) {
    return <EmptyValueFallback value={null} />;
  }

  return (
    <ArticleImagePreviewLabel
      alt={article.cover_image_alt}
      imagePath={article.cover_image_url}
      onClick={() => onPreviewImage(article)}
    />
  );
}

function StatusToggleButton({
  article,
  onToggleArticleStatus,
}: {
  article: Article;
  onToggleArticleStatus: (article: Article) => void;
}) {
  const isPublished = article.status === "published";
  const Icon = isPublished ? Eye : EyeOff;
  const label = isPublished ? "Repasser en brouillon" : "Publier";

  return (
    <ArticleActionButton
      label={label}
      icon={Icon}
      onClick={() => onToggleArticleStatus(article)}
    />
  );
}

function EmptyValueFallback({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-stone-400 dark:text-stone-600">-</span>;
  }

  return value;
}

function ArticleActionButton({
  isDanger = false,
  label,
  icon: Icon,
  onClick,
}: {
  isDanger?: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border transition-colors",
        isDanger
          ? "border-red-200 bg-red-50 text-[#f44336] hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
          : "border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-950 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400 dark:hover:bg-[#18191b] dark:hover:text-white",
      ].join(" ")}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function ArticlesLoadingState() {
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

function ArticlesErrorState() {
  return (
    <div className="flex w-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-base font-semibold text-stone-950 dark:text-white">
          Impossible de charger les articles
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Le detail de l'erreur est affiche dans le toast.
        </p>
      </div>
    </div>
  );
}

function ArticlesEmptyState({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-base font-semibold text-stone-950 dark:text-white">
          {title}
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          Les articles apparaîtront ici lorsque Supabase retournera des données.
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function formatNullableDate(value: string | null) {
  return value ? formatDate(value) : "Non publié";
}

function compareArticles(
  firstArticle: Article,
  secondArticle: Article,
  sortState: ActiveSortState,
  categoryNameById: Map<string, string>,
  articleTagsById: Map<string, Tag[]>,
) {
  const directionMultiplier = sortState.direction === "asc" ? 1 : -1;
  const firstValue = getSortableValue(
    firstArticle,
    sortState.column,
    categoryNameById,
    articleTagsById,
  );
  const secondValue = getSortableValue(
    secondArticle,
    sortState.column,
    categoryNameById,
    articleTagsById,
  );

  if (firstValue < secondValue) {
    return -1 * directionMultiplier;
  }

  if (firstValue > secondValue) {
    return 1 * directionMultiplier;
  }

  return 0;
}

function getSortableValue(
  article: Article,
  column: SortColumn,
  categoryNameById: Map<string, string>,
  articleTagsById: Map<string, Tag[]>,
) {
  if (column === "published_at" || column === "updated_at") {
    const value = article[column];

    return value ? new Date(value).getTime() : 0;
  }

  if (column === "category") {
    return article.category_id
      ? (categoryNameById.get(article.category_id) ?? "").toLowerCase()
      : "";
  }

  if (column === "tags") {
    return getArticleTagsLabel(article, articleTagsById).toLowerCase();
  }

  if (column === "seo") {
    return [article.meta_title, article.meta_description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  if (column === "image") {
    return article.cover_image_url ? 1 : 0;
  }

  return String(article[column] ?? "").toLowerCase();
}

function getArticleTagsLabel(
  article: Article,
  articleTagsById: Map<string, Tag[]>,
) {
  return (articleTagsById.get(article.id) ?? [])
    .map((tag) => tag.name)
    .join(" ");
}
