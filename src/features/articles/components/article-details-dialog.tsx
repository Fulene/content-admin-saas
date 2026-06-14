"use client";

import { type AnimationEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Pencil, X } from "lucide-react";
import { IconButtonTooltip } from "@/components/feedback/icon-button-tooltip";
import type { ArticleEditFocusTarget } from "@/features/articles/components/article-edit-drawer";
import { ArticleImagePreviewLabel } from "@/features/articles/components/article-image-preview-label";
import type { Article } from "@/features/articles/types/article";
import type { Tag } from "@/features/tags/types/tag";

export function ArticleDetailsDialog({
  article,
  canEdit,
  categoryName,
  tags,
  onPreviewImage,
  onEditField,
  onClose,
}: {
  article: Article | null;
  canEdit: boolean;
  categoryName: string | null;
  tags: Tag[];
  onPreviewImage: (article: Article) => void;
  onEditField: (field: ArticleEditFocusTarget) => void;
  onClose: () => void;
}) {
  const [mountedArticle, setMountedArticle] = useState<Article | null>(article);
  const [mountedCategoryName, setMountedCategoryName] = useState<string | null>(
    categoryName,
  );
  const [mountedTags, setMountedTags] = useState<Tag[]>(tags);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (article) {
      setMountedArticle(article);
      setMountedCategoryName(categoryName);
      setMountedTags(tags);
      setIsClosing(false);
      return;
    }

    if (mountedArticle) {
      setIsClosing(true);
    }
  }, [article, categoryName, mountedArticle, tags]);

  function handleAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || !isClosing) {
      return;
    }

    setMountedArticle(null);
    setIsClosing(false);
  }

  if (!mountedArticle) {
    return null;
  }

  const dialogAnimationClass = isClosing
    ? "article-details-dialog-out"
    : "article-details-dialog-in";
  const backdropAnimationClass = isClosing
    ? "article-details-backdrop-out"
    : "article-details-backdrop-in";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-5 py-8">
      <button
        type="button"
        onClick={onClose}
        className={`${backdropAnimationClass} absolute inset-0 cursor-pointer bg-black/45`}
        aria-label="Fermer"
      />

      <section
        className={`${dialogAnimationClass} relative z-[1] flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517]`}
        onAnimationEnd={handleAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between gap-5 border-b border-stone-200 px-5 py-4 dark:border-[#2d2e30]">
          <div className="group/title relative min-w-0 pr-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
              Article
            </p>
            <h2 className="mt-1 truncate text-xl font-bold text-stone-950 dark:text-white">
              {mountedArticle.title}
            </h2>
            <p className="mt-1 truncate text-sm text-stone-500 dark:text-stone-400">
              /{mountedArticle.slug}
            </p>
            {canEdit ? (
              <EditFieldButton
                label="Modifier le titre"
                className="absolute right-0 top-5 opacity-0 group-hover/title:opacity-100 group-focus-within/title:opacity-100"
                onClick={() => onEditField("title")}
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ArticleStatusText status={mountedArticle.status} />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#111213] dark:text-stone-300 dark:hover:bg-[#18191b]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="grid gap-5">
              <DetailBlock
                title="Résumé"
                onEdit={canEdit ? () => onEditField("summary") : undefined}
              >
                <p>{mountedArticle.summary}</p>
              </DetailBlock>

              <DetailBlock
                title="Corps de l'article"
                onEdit={canEdit ? () => onEditField("content") : undefined}
              >
                <p className="whitespace-pre-wrap">{mountedArticle.content}</p>
              </DetailBlock>
            </div>

            <aside className="grid content-start gap-4">
              <DetailBlock
                title="Catégorie"
                onEdit={canEdit ? () => onEditField("category") : undefined}
              >
                <EmptyFallback value={mountedCategoryName} />
              </DetailBlock>
              <DetailBlock
                title="Tags"
                onEdit={canEdit ? () => onEditField("tags") : undefined}
              >
                {mountedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mountedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-[#ffc2b8] bg-[#ffe7e2] px-2.5 py-1 text-xs font-semibold text-[#9f2119] dark:border-[#7a3329] dark:bg-[#3a211c] dark:text-[#ffb199]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyFallback value={null} />
                )}
              </DetailBlock>
              <DetailBlock
                title="SEO"
                onEdit={canEdit ? () => onEditField("metaTitle") : undefined}
              >
                <div className="grid gap-2">
                  <MetadataLine
                    label="Meta title"
                    value={mountedArticle.meta_title}
                  />
                  <MetadataLine
                    label="Meta description"
                    value={mountedArticle.meta_description}
                  />
                </div>
              </DetailBlock>
              <DetailBlock
                title="Image"
                onEdit={
                  canEdit ? () => onEditField("coverImageAlt") : undefined
                }
              >
                <div className="flex min-w-0 flex-nowrap items-baseline gap-2 overflow-hidden">
                  {mountedArticle.cover_image_url ? (
                    <ArticleImagePreviewLabel
                      alt={mountedArticle.cover_image_alt}
                      className="max-w-[45%] shrink-0"
                      imagePath={mountedArticle.cover_image_url}
                      onClick={() => onPreviewImage(mountedArticle)}
                    />
                  ) : (
                    <EmptyFallback value={null} />
                  )}
                  {mountedArticle.cover_image_url &&
                  mountedArticle.cover_image_alt ? (
                    <span className="shrink-0 text-xs text-stone-400 dark:text-stone-600">
                      -
                    </span>
                  ) : null}
                  {mountedArticle.cover_image_alt ? (
                    <span className="min-w-0 flex-1 truncate text-xs text-stone-500 dark:text-stone-400">
                      Alt : {mountedArticle.cover_image_alt}
                    </span>
                  ) : null}
                </div>
              </DetailBlock>
              <DetailBlock title="Dates">
                <div className="grid gap-1">
                  <MetadataLine
                    label="Création"
                    value={formatDate(mountedArticle.created_at)}
                  />
                  <MetadataLine
                    label="Modification"
                    value={formatDate(mountedArticle.updated_at)}
                  />
                </div>
              </DetailBlock>
            </aside>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DetailBlock({
  children,
  onEdit,
  title,
}: {
  children: ReactNode;
  onEdit?: () => void;
  title: string;
}) {
  return (
    <section className="group/block relative rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-300">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-500">
          {title}
        </h3>
        {onEdit ? (
          <EditFieldButton
            label={`Modifier ${title}`}
            className="opacity-0 group-hover/block:opacity-100 group-focus-within/block:opacity-100"
            onClick={onEdit}
          />
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EditFieldButton({
  className = "",
  label,
  onClick,
}: {
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <IconButtonTooltip
      label={label}
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 shadow-sm transition-[opacity,color,background-color] hover:bg-stone-100 hover:text-[#f44336] dark:border-[#2d2e30] dark:bg-[#18191b] dark:text-stone-400 dark:hover:bg-[#24262a] dark:hover:text-[#ff8a3d]",
        className,
      ].join(" ")}
      aria-label={label}
    >
      <Pencil className="h-4 w-4" aria-hidden="true" />
    </IconButtonTooltip>
  );
}

function MetadataLine({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <p>
      <span className="font-semibold text-stone-950 dark:text-white">
        {label} :
      </span>{" "}
      <EmptyFallback value={value} />
    </p>
  );
}

function EmptyFallback({ value }: { value: string | null }) {
  return value ? (
    <span>{value}</span>
  ) : (
    <span className="text-stone-400 dark:text-stone-600">-</span>
  );
}

function ArticleStatusText({ status }: { status: Article["status"] }) {
  const isPublished = status === "published";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        isPublished
          ? "h-10 items-center border-emerald-200 bg-emerald-50 px-4 text-sm text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "h-10 items-center border-[#ffc2b8] bg-[#ffe7e2] px-4 text-sm text-[#9f2119] dark:border-[#7a3329] dark:bg-[#3a211c] dark:text-[#ffb199]",
      ].join(" ")}
    >
      {isPublished ? "Publié" : "Brouillon"}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}
