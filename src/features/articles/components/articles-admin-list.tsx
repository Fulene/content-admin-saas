"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { getArticles } from "@/features/articles/services/articles.service";
import type {
  Article,
  ArticleStatus,
  ArticleStatusFilter,
} from "@/features/articles/types/article";

type LoadState = "idle" | "loading" | "success" | "error";
type SortColumn =
  | "title"
  | "category_name"
  | "status"
  | "published_at"
  | "updated_at"
  | "updated_by";
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
  { label: "Brouillons", value: "draft" },
  { label: "Publiés", value: "published" },
];

const statusLabels: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  published: "Publie",
};

export function ArticlesAdminList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArticleStatusFilter>("all");
  const [sortState, setSortState] = useState<SortState>({
    column: "updated_at",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    let isMounted = true;

    async function loadArticles() {
      setLoadState("loading");
      setErrorMessage(null);

      try {
        const data = await getArticles();

        if (!isMounted) {
          return;
        }

        setArticles(data);
        setLoadState("success");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les articles.",
        );
        setLoadState("error");
      }
    }

    void loadArticles();

    return () => {
      isMounted = false;
    };
  }, []);

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
          article.category_name,
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
          ? compareArticles(firstArticle, secondArticle, sortState)
          : 0,
      );
  }, [articles, searchQuery, sortState, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredArticles.length / itemsPerPage),
  );

  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredArticles.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredArticles, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchQuery, sortState, statusFilter]);

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

  return (
    <section className="flex min-h-full flex-col gap-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full lg:max-w-sm">
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

        <div className="flex flex-wrap items-center gap-3 lg:justify-center">
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
          <span className="text-xs font-medium text-stone-500 dark:text-stone-500">
            {filteredArticles.length} article
            {filteredArticles.length > 1 ? "s" : ""} au total
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="flex rounded-lg border border-stone-200 bg-white dark:border-[#2d2e30] dark:bg-[#141517]">
        {loadState === "loading" || loadState === "idle" ? (
          <ArticlesLoadingState />
        ) : null}

        {loadState === "error" ? (
          <ArticlesErrorState message={errorMessage} />
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
            sortState={sortState}
            onSort={handleSort}
          />
        ) : null}
      </div>

      {loadState === "success" && filteredArticles.length > 0 ? (
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-600 transition-colors hover:bg-stone-50 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-stone-300 dark:hover:bg-[#18191b]"
      >
        <span className="whitespace-nowrap">Par page</span>
        <span className="font-semibold text-stone-950 dark:text-white">
          {itemsPerPage}
        </span>
        <ChevronDown className="h-4 w-4 text-stone-700 dark:text-stone-300" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-11 z-20 min-w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg dark:border-[#2d2e30] dark:bg-[#141517]">
          {ITEMS_PER_PAGE_OPTIONS.map((option) => {
            const isActive = option === itemsPerPage;

            return (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onItemsPerPageChange(option);
                  setIsOpen(false);
                }}
                className={[
                  "flex h-9 w-full cursor-pointer items-center px-3 text-left text-sm transition-colors",
                  isActive
                    ? "bg-red-50 font-semibold text-stone-950 dark:bg-[#24262a] dark:text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ArticlesTable({
  articles,
  sortState,
  onSort,
}: {
  articles: Article[];
  sortState: SortState;
  onSort: (column: SortColumn) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-500 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400">
          <tr>
            <SortableTableHeader
              column="title"
              label="Titre"
              className="w-[32%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="category_name"
              label="Categorie"
              className="w-[13%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="status"
              label="Statut"
              className="w-[10%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="published_at"
              label="Publication"
              className="w-[13%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="updated_at"
              label="Modification"
              className="w-[13%]"
              sortState={sortState}
              onSort={onSort}
            />
            <SortableTableHeader
              column="updated_by"
              label="Modifie par"
              className="w-[10%]"
              sortState={sortState}
              onSort={onSort}
            />
            <th className="w-[9%] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
          {articles.map((article) => (
            <tr
              key={article.id}
              className="text-stone-700 dark:text-stone-300"
            >
              <td className="px-4 py-4">
                <div className="font-semibold text-stone-950 dark:text-white">
                  {article.title}
                </div>
                <div className="mt-1 truncate text-xs text-stone-500 dark:text-stone-500">
                  /{article.slug}
                </div>
              </td>
              <td className="px-4 py-4">
                <EmptyValueFallback value={article.category_name} />
              </td>
              <td className="px-4 py-4">
                <ArticleStatusBadge status={article.status} />
              </td>
              <td className="px-4 py-4">
                {formatDate(article.published_at)}
              </td>
              <td className="px-4 py-4">{formatDate(article.updated_at)}</td>
              <td className="px-4 py-4">
                <EmptyValueFallback value={formatUserId(article.updated_by)} />
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <DisabledActionButton label="Voir" icon={Eye} />
                  <DisabledActionButton label="Modifier" icon={Pencil} />
                  <DisabledActionButton label="Supprimer" icon={Trash2} />
                </div>
              </td>
            </tr>
          ))}
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
          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
      ].join(" ")}
    >
      {statusLabels[status]}
    </span>
  );
}

function EmptyValueFallback({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-stone-400 dark:text-stone-600">-</span>;
  }

  return value;
}

function DisabledActionButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Eye;
}) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-400 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-600"
      title={`${label} - indisponible`}
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

function ArticlesErrorState({ message }: { message: string | null }) {
  return (
    <div className="flex w-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-base font-semibold text-stone-950 dark:text-white">
          Impossible de charger les articles
        </p>
        <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          {message ?? "Une erreur inconnue est survenue."}
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
          Les articles apparaitront ici lorsque Supabase retournera des donnees.
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Non publie";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function formatUserId(value: string | null) {
  return value ? value.slice(0, 8) : "";
}

function compareArticles(
  firstArticle: Article,
  secondArticle: Article,
  sortState: ActiveSortState,
) {
  const directionMultiplier = sortState.direction === "asc" ? 1 : -1;
  const firstValue = getSortableValue(firstArticle, sortState.column);
  const secondValue = getSortableValue(secondArticle, sortState.column);

  if (firstValue < secondValue) {
    return -1 * directionMultiplier;
  }

  if (firstValue > secondValue) {
    return 1 * directionMultiplier;
  }

  return 0;
}

function getSortableValue(article: Article, column: SortColumn) {
  if (column === "published_at" || column === "updated_at") {
    const value = article[column];

    return value ? new Date(value).getTime() : 0;
  }

  if (column === "updated_by") {
    return formatUserId(article.updated_by).toLowerCase();
  }

  return String(article[column] ?? "").toLowerCase();
}
