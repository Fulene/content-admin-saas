"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, Loader2, X } from "lucide-react";
import { getArticleImageName } from "@/features/articles/components/article-image-preview-label";
import { createArticleImageDisplayUrl } from "@/features/articles/services/articles.service";
import type { Article } from "@/features/articles/types/article";

export function ArticleImageDialog({
  article,
  onClose,
}: {
  article: Article | null;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageState, setImageState] = useState<"idle" | "loading" | "error">(
    "idle",
  );

  useEffect(() => {
    if (!article?.cover_image_url) {
      setImageUrl(null);
      setImageState("idle");
      return;
    }

    let isMounted = true;

    async function loadImageUrl() {
      setImageState("loading");

      try {
        const displayUrl = await createArticleImageDisplayUrl(
          article?.cover_image_url ?? null,
        );

        if (!isMounted) {
          return;
        }

        setImageUrl(displayUrl);
        setImageState(displayUrl ? "idle" : "error");
      } catch {
        if (!isMounted) {
          return;
        }

        setImageUrl(null);
        setImageState("error");
      }
    }

    void loadImageUrl();

    return () => {
      isMounted = false;
    };
  }, [article]);

  if (!article) {
    return null;
  }

  const imageName = article.cover_image_url
    ? getArticleImageName(article.cover_image_url, article.cover_image_alt)
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-5 py-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/55"
        aria-label="Fermer"
      />

      <section className="relative z-[1] flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 dark:border-[#2d2e30]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
              Image de couverture
            </p>
            <h2 className="mt-1 truncate text-xl font-bold text-stone-950 dark:text-white">
              {article.title}
            </h2>
            {imageName || article.cover_image_alt ? (
              <div className="mt-1 flex min-w-0 max-w-full flex-nowrap items-baseline gap-2 overflow-hidden text-sm">
                {imageName ? (
                  <p className="min-w-0 max-w-[48%] shrink-0 truncate font-semibold text-stone-700 dark:text-stone-300">
                    {imageName}
                  </p>
                ) : null}
                {imageName && article.cover_image_alt ? (
                  <span className="shrink-0 text-stone-400 dark:text-stone-600">
                    -
                  </span>
                ) : null}
                {article.cover_image_alt ? (
                  <p className="min-w-0 flex-1 truncate text-stone-500 dark:text-stone-400">
                    Alt : {article.cover_image_alt}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-[#111213] dark:text-stone-300 dark:hover:bg-[#18191b]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-80 items-center justify-center bg-stone-100 p-5 dark:bg-[#0b0c0e]">
          {imageState === "loading" ? (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Chargement de l'image...
            </div>
          ) : null}

          {imageState === "error" || !imageUrl ? (
            <div className="grid justify-items-center gap-3 text-center text-sm text-stone-500 dark:text-stone-400">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-stone-500 dark:bg-[#18191b] dark:text-stone-400">
                <ImageOff className="h-5 w-5" aria-hidden="true" />
              </div>
              Impossible d'afficher cette image.
            </div>
          ) : null}

          {imageUrl && imageState !== "error" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={article.cover_image_alt ?? ""}
              onError={() => setImageState("error")}
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
