"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Search, Trash2 } from "lucide-react";
import { getArticles } from "@/features/articles/services/articles.service";
import type {
  Article,
  ArticleStatus,
  ArticleStatusFilter,
} from "@/features/articles/types/article";

type LoadState = "idle" | "loading" | "success" | "error";

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

    return articles.filter((article) => {
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
    });
  }, [articles, searchQuery, statusFilter]);

  return (
    <section className="flex min-h-full flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
          <ArticlesTable articles={filteredArticles} />
        ) : null}
      </div>
    </section>
  );
}

function ArticlesTable({ articles }: { articles: Article[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-500 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-400">
          <tr>
            <th className="px-4 py-3">Titre</th>
            <th className="px-4 py-3">Categorie</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Publication</th>
            <th className="px-4 py-3">Modification</th>
            <th className="px-4 py-3">Modifie par</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-[#2d2e30]">
          {articles.map((article) => (
            <tr
              key={article.id}
              className="text-stone-700 dark:text-stone-300"
            >
              <td className="max-w-[320px] px-4 py-4">
                <div className="font-semibold text-stone-950 dark:text-white">
                  {article.title}
                </div>
                <div className="mt-1 truncate text-xs text-stone-500 dark:text-stone-500">
                  /{article.slug}
                </div>
              </td>
              <td className="px-4 py-4">
                {article.category_name || "Sans categorie"}
              </td>
              <td className="px-4 py-4">
                <ArticleStatusBadge status={article.status} />
              </td>
              <td className="px-4 py-4">
                {formatDate(article.published_at)}
              </td>
              <td className="px-4 py-4">{formatDate(article.updated_at)}</td>
              <td className="px-4 py-4">{formatUserId(article.updated_by)}</td>
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
  if (!value) {
    return "Non renseigne";
  }

  return value.slice(0, 8);
}
