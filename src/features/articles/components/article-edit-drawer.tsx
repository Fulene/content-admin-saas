"use client";

import {
  type AnimationEvent,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Save, UploadCloud, X } from "lucide-react";
import { ZodError } from "zod";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { CreatableChipCombobox } from "@/components/forms/creatable-chip-combobox";
import { CreatableDropdown } from "@/components/forms/creatable-dropdown";
import {
  articleCreateSchema,
  type ArticleCreateValues,
} from "@/features/articles/schemas/article-create.schema";
import {
  createArticleImageDisplayUrl,
  updateArticleWithTags,
} from "@/features/articles/services/articles.service";
import { getArticleImageName } from "@/features/articles/components/article-image-preview-label";
import type { Article } from "@/features/articles/types/article";
import {
  createCategory,
  getCategories,
} from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/category";
import { useActiveSite } from "@/features/sites/components/active-site-provider";
import { createTag, getTags } from "@/features/tags/services/tags.service";
import type { Tag } from "@/features/tags/types/tag";

type DrawerState = "idle" | "loading" | "success" | "error";
export type ArticleEditFocusTarget =
  | "category"
  | "content"
  | "coverImage"
  | "coverImageAlt"
  | "metaDescription"
  | "metaTitle"
  | "slug"
  | "summary"
  | "tags"
  | "title";

const EMPTY_VALUES: ArticleCreateValues = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  categoryId: null,
  tagIds: [],
  coverImageAlt: null,
  metaTitle: null,
  metaDescription: null,
};

export function ArticleEditDrawer({
  article,
  articleTags,
  focusTarget,
  isOpen,
  onArticleUpdated,
  onClose,
}: {
  article: Article | null;
  articleTags: Tag[];
  focusTarget: ArticleEditFocusTarget | null;
  isOpen: boolean;
  onArticleUpdated: (message: ToastMessageState) => void;
  onClose: () => void;
}) {
  const { activeSiteId } = useActiveSite();
  const [values, setValues] = useState<ArticleCreateValues>(EMPTY_VALUES);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState<
    string | null
  >(null);
  const [isCoverImageDragActive, setIsCoverImageDragActive] = useState(false);
  const [currentCoverImageDisplayUrl, setCurrentCoverImageDisplayUrl] =
    useState<string | null>(null);
  const [hasSlugBeenEdited, setHasSlugBeenEdited] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [drawerState, setDrawerState] = useState<DrawerState>("idle");
  const [metadataState, setMetadataState] = useState<DrawerState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [mountedArticle, setMountedArticle] = useState<Article | null>(article);
  const [mountedArticleTags, setMountedArticleTags] =
    useState<Tag[]>(articleTags);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const slugInputRef = useRef<HTMLInputElement | null>(null);
  const summaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const categoryFieldRef = useRef<HTMLDivElement | null>(null);
  const tagsFieldRef = useRef<HTMLDivElement | null>(null);
  const metaTitleInputRef = useRef<HTMLInputElement | null>(null);
  const metaDescriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageAltInputRef = useRef<HTMLInputElement | null>(null);
  const currentArticle = article ?? mountedArticle;
  const currentArticleTags = article ? articleTags : mountedArticleTags;

  const initialValues = useMemo<ArticleCreateValues>(
    () =>
      currentArticle
        ? {
            title: currentArticle.title,
            slug: currentArticle.slug,
            summary: currentArticle.summary,
            content: currentArticle.content,
            categoryId: currentArticle.category_id,
            tagIds: currentArticleTags.map((tag) => tag.id),
            coverImageAlt: currentArticle.cover_image_alt,
            metaTitle: currentArticle.meta_title,
            metaDescription: currentArticle.meta_description,
          }
        : EMPTY_VALUES,
    [currentArticle, currentArticleTags],
  );

  const isDirty = useMemo(
    () =>
      JSON.stringify(values) !== JSON.stringify(initialValues) ||
      coverImageFile !== null,
    [coverImageFile, initialValues, values],
  );

  useEffect(() => {
    if (isOpen) {
      setIsDrawerMounted(true);
      setIsClosing(false);
      return;
    }

    if (isDrawerMounted) {
      setIsClosing(true);
    }
  }, [isDrawerMounted, isOpen]);

  useEffect(() => {
    if (!article) {
      return;
    }

    setMountedArticle(article);
    setMountedArticleTags(articleTags);
  }, [article, articleTags]);

  useEffect(() => {
    if (!isOpen || !currentArticle) {
      return;
    }

    setValues(initialValues);
    setCoverImageFile(null);
    setCoverImagePreviewUrl(null);
    setIsCoverImageDragActive(false);
    setHasSlugBeenEdited(true);
    setErrorMessage(null);
    setDrawerState("idle");
  }, [currentArticle, initialValues, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    async function loadMetadata() {
      setMetadataState("loading");
      setErrorMessage(null);

      try {
        const [categoryData, tagData] = await Promise.all([
          getCategories(activeSiteId),
          getTags(activeSiteId),
        ]);

        if (!isMounted) {
          return;
        }

        setCategories(categoryData);
        setTags(tagData);
        setMetadataState("success");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMetadataState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les données du formulaire.",
        );
      }
    }

    void loadMetadata();

    return () => {
      isMounted = false;
    };
  }, [activeSiteId, isOpen]);

  useEffect(() => {
    if (!coverImageFile) {
      setCoverImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(coverImageFile);
    setCoverImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [coverImageFile]);

  useEffect(() => {
    if (!isOpen || !currentArticle?.cover_image_url) {
      setCurrentCoverImageDisplayUrl(null);
      return;
    }

    let isMounted = true;

    void createArticleImageDisplayUrl(currentArticle.cover_image_url)
      .then((displayUrl) => {
        if (isMounted) {
          setCurrentCoverImageDisplayUrl(displayUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentCoverImageDisplayUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentArticle?.cover_image_url, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentArticle || !focusTarget) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      focusEditTarget(focusTarget, {
        categoryFieldRef,
        contentTextareaRef,
        coverImageAltInputRef,
        coverImageInputRef,
        metaDescriptionTextareaRef,
        metaTitleInputRef,
        slugInputRef,
        summaryTextareaRef,
        tagsFieldRef,
        titleInputRef,
      });
    }, 380);

    return () => window.clearTimeout(timeoutId);
  }, [currentArticle, focusTarget, isOpen]);

  function resetForm() {
    setValues(EMPTY_VALUES);
    setCoverImageFile(null);
    setCoverImagePreviewUrl(null);
    setIsCoverImageDragActive(false);
    setHasSlugBeenEdited(true);
    setErrorMessage(null);
    setDrawerState("idle");
  }

  function requestClose() {
    if (drawerState === "loading" || isClosing) {
      return;
    }

    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    onClose();
  }

  function confirmClose() {
    setIsDiscardDialogOpen(false);
    onClose();
  }

  function handleDrawerAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || !isClosing) {
      return;
    }

    setIsDrawerMounted(false);
    setIsClosing(false);
    resetForm();
  }

  function updateTitle(title: string) {
    setValues((currentValues) => ({
      ...currentValues,
      title,
      slug: hasSlugBeenEdited ? currentValues.slug : slugify(title),
    }));
  }

  async function handleCreateCategory(categoryName: string) {
    const categorySlug = slugify(categoryName);

    if (!categorySlug) {
      throw new Error("Le nom de categorie est invalide.");
    }

    const createdCategory = await createCategory({
      siteId: activeSiteId,
      name: categoryName,
      slug: categorySlug,
    });

    setCategories((currentCategories) =>
      [...currentCategories, createdCategory].toSorted((first, second) =>
        first.name.localeCompare(second.name),
      ),
    );

    return {
      id: createdCategory.id,
      label: createdCategory.name,
      description: createdCategory.slug,
    };
  }

  async function handleCreateTag(tagName: string) {
    const tagSlug = slugify(tagName);

    if (!tagSlug) {
      throw new Error("Le nom de tag est invalide.");
    }

    const createdTag = await createTag({
      siteId: activeSiteId,
      name: tagName,
      slug: tagSlug,
    });

    setTags((currentTags) =>
      [...currentTags, createdTag].toSorted((first, second) =>
        first.name.localeCompare(second.name),
      ),
    );

    return {
      id: createdTag.id,
      label: createdTag.name,
    };
  }

  async function handleSubmit(status: "draft" | "published") {
    if (!currentArticle) {
      return;
    }

    setDrawerState("loading");
    setErrorMessage(null);

    try {
      const parsedValues = articleCreateSchema.parse(values);

      await updateArticleWithTags({
        articleId: currentArticle.id,
        siteId: activeSiteId,
        status,
        categoryId: parsedValues.categoryId,
        title: parsedValues.title,
        slug: parsedValues.slug,
        summary: parsedValues.summary,
        content: parsedValues.content,
        coverImageFile,
        currentCoverImageUrl: currentArticle.cover_image_url,
        currentTagIds: currentArticleTags.map((tag) => tag.id),
        coverImageAlt: normalizeOptionalText(parsedValues.coverImageAlt),
        metaTitle: normalizeOptionalText(parsedValues.metaTitle),
        metaDescription: normalizeOptionalText(parsedValues.metaDescription),
        publishedAt: currentArticle.published_at,
        tagIds: parsedValues.tagIds,
      });

      setDrawerState("success");
      onArticleUpdated({
        status: "success",
        text: "Article enregistré avec succès.",
      });
      onClose();
    } catch (error) {
      setDrawerState("error");

      if (error instanceof ZodError) {
        setErrorMessage(error.issues[0]?.message ?? "Formulaire invalide.");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier l'article.",
      );
    }
  }

  function handleCoverImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    setCoverImageFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleCoverImageDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsCoverImageDragActive(true);
  }

  function handleCoverImageDragLeave(event: DragEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const isStillInside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!isStillInside) {
      setIsCoverImageDragActive(false);
    }
  }

  function handleCoverImageDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsCoverImageDragActive(true);
  }

  function handleCoverImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsCoverImageDragActive(false);
    const file = event.dataTransfer.files.item(0);

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Le fichier déposé doit être une image.");
      return;
    }

    setCoverImageFile(file);
  }

  if (!isDrawerMounted || !currentArticle) {
    return null;
  }

  const backdropAnimationClass = isClosing
    ? "article-create-drawer-backdrop-out"
    : "article-create-drawer-backdrop-in";
  const drawerAnimationClass = isClosing
    ? "article-create-drawer-out"
    : "article-create-drawer-in";
  const displayedCoverImageUrl =
    coverImagePreviewUrl ?? currentCoverImageDisplayUrl;
  const displayedCoverImageName =
    coverImageFile?.name ??
    (currentArticle.cover_image_url
      ? getArticleImageName(
          currentArticle.cover_image_url,
          currentArticle.cover_image_alt,
        )
      : null);

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
      <ToastMessage
        message={
          errorMessage
            ? {
                status: "error",
                text: errorMessage,
              }
            : null
        }
        onClose={() => setErrorMessage(null)}
      />

      <button
        type="button"
        onClick={requestClose}
        className={`${backdropAnimationClass} absolute inset-0 cursor-pointer bg-black/35`}
        aria-label="Fermer le panneau"
      />

      <aside
        className={`${drawerAnimationClass} relative z-[1] flex h-full max-h-dvh w-full flex-col border-l border-stone-200 bg-white shadow-2xl dark:border-[#2d2e30] dark:bg-[#141517] sm:max-w-none lg:max-w-[50vw] xl:max-w-[860px]`}
        onAnimationEnd={handleDrawerAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-[#2d2e30]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f44336] dark:text-[#ff8a3d]">
              Article
            </p>
            <h2 className="mt-1 text-xl font-bold text-stone-950 dark:text-white">
              Modifier l'article
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

        <form className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="grid gap-5">
              <TextField
                label="Titre"
                value={values.title}
                required
                inputRef={titleInputRef}
                onChange={updateTitle}
              />

              <TextField
                label="Slug"
                value={values.slug}
                required
                inputRef={slugInputRef}
                onChange={(slug) => {
                  setHasSlugBeenEdited(true);
                  setValues((currentValues) => ({
                    ...currentValues,
                    slug: slugify(slug),
                  }));
                }}
              />

              <TextAreaField
                label="Résumé"
                value={values.summary}
                required
                inputRef={summaryTextareaRef}
                rows={3}
                onChange={(summary) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    summary,
                  }))
                }
              />

              <TextAreaField
                label="Contenu"
                value={values.content}
                required
                inputRef={contentTextareaRef}
                rows={9}
                onChange={(content) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    content,
                  }))
                }
              />

              <div ref={categoryFieldRef}>
                <CreatableDropdown
                  createLabel="Creer la categorie"
                  disabled={metadataState === "loading"}
                  emptyLabel="Aucune categorie disponible."
                  label="Catégorie"
                  options={categories.map((category) => ({
                    id: category.id,
                    label: category.name,
                  }))}
                  placeholder="Taper pour rechercher ou créer"
                  value={values.categoryId}
                  onChange={(categoryId) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      categoryId,
                    }))
                  }
                  onCreate={handleCreateCategory}
                  onCreateError={setErrorMessage}
                />
              </div>

              <div ref={tagsFieldRef}>
                <CreatableChipCombobox
                  createLabel="Creer le tag"
                  disabled={metadataState === "loading"}
                  emptyLabel="Aucun tag disponible."
                  label="Tags"
                  options={tags.map((tag) => ({
                    id: tag.id,
                    label: tag.name,
                  }))}
                  value={values.tagIds}
                  onChange={(tagIds) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      tagIds,
                    }))
                  }
                  onCreate={handleCreateTag}
                  onCreateError={setErrorMessage}
                />
              </div>

              <TextField
                label="Meta title"
                value={values.metaTitle ?? ""}
                inputRef={metaTitleInputRef}
                onChange={(metaTitle) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    metaTitle,
                  }))
                }
              />

              <TextAreaField
                label="Meta description"
                value={values.metaDescription ?? ""}
                inputRef={metaDescriptionTextareaRef}
                rows={3}
                onChange={(metaDescription) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    metaDescription,
                  }))
                }
              />

              <div
                className={[
                  "relative grid gap-3 overflow-hidden rounded-lg border border-dashed p-4 transition-colors",
                  isCoverImageDragActive
                    ? "border-[#f44336] bg-red-50/50 dark:border-[#ff8a3d] dark:bg-[#241812]"
                    : "border-stone-300 dark:border-[#2d2e30] dark:hover:border-[#ff8a3d]/60",
                ].join(" ")}
                onDragEnter={handleCoverImageDragEnter}
                onDragLeave={handleCoverImageDragLeave}
                onDragOver={handleCoverImageDragOver}
                onDrop={handleCoverImageDrop}
              >
                {isCoverImageDragActive ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 text-center dark:bg-[#141517]/92">
                    <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#f44336] text-white shadow-lg shadow-red-500/20 dark:bg-[#ff8a3d] dark:text-stone-950">
                      <UploadCloud className="h-8 w-8" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-bold text-stone-950 dark:text-white">
                      Dépose l'image ici
                    </span>
                    {currentArticle.cover_image_url ? (
                      <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                        Le fichier remplacera l'image de couverture actuelle.
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[#f44336] dark:bg-[#24262a] dark:text-[#ff8a3d]">
                    <UploadCloud className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                      Image de couverture
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {currentArticle.cover_image_url
                        ? "Image actuelle conservée si aucun nouveau fichier n'est choisi."
                        : "Dépose une image ici ou utilise le bouton de sélection."}
                    </p>
                  </div>
                </div>

                {displayedCoverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayedCoverImageUrl}
                    alt={values.coverImageAlt ?? ""}
                    className="h-40 w-full rounded-md object-cover"
                  />
                ) : null}

                <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                  {displayedCoverImageName ?? "Aucun fichier sélectionné"}
                </p>

                <div>
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageInputChange}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => coverImageInputRef.current?.click()}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-stone-100 px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-200 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-stone-200 dark:hover:bg-[#18191b]"
                  >
                    Choisir un fichier
                  </button>
                </div>

                <TextField
                  label="Texte alternatif image (attribut alt)"
                  value={values.coverImageAlt ?? ""}
                  inputRef={coverImageAltInputRef}
                  onChange={(coverImageAlt) =>
                    setValues((currentValues) => ({
                      ...currentValues,
                      coverImageAlt,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <footer className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-white px-5 py-4 dark:border-[#2d2e30] dark:bg-[#141517] sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={requestClose}
              disabled={drawerState === "loading"}
              className="h-10 w-full cursor-pointer rounded-md px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950 disabled:cursor-default disabled:opacity-60 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white sm:w-auto"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={drawerState === "loading" || metadataState !== "success"}
              onClick={() => {
                void handleSubmit(currentArticle.status);
              }}
              className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-4 text-sm font-semibold text-white hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] sm:w-auto"
            >
              {drawerState === "loading" ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Enregistrer
            </button>
          </footer>
        </form>
      </aside>

      <ConfirmDialog
        cancelLabel="Continuer l'edition"
        confirmLabel="Fermer sans enregistrer"
        isDanger
        isOpen={isDiscardDialogOpen}
        title="Abandonner les modifications ?"
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={confirmClose}
      >
        Les modifications non enregistrées seront perdues.
      </ConfirmDialog>
    </div>
  );
}

function TextField({
  inputRef,
  label,
  onChange,
  required = false,
  value,
}: {
  inputRef?: RefObject<HTMLInputElement | null>;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        {label}
        {required ? <span className="text-[#f44336]"> *</span> : null}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
      />
    </label>
  );
}

function TextAreaField({
  inputRef,
  label,
  onChange,
  required = false,
  rows,
  value,
}: {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows: number;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        {label}
        {required ? <span className="text-[#f44336]"> *</span> : null}
      </span>
      <textarea
        ref={inputRef}
        value={value}
        required={required}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
      />
    </label>
  );
}

function focusEditTarget(
  target: ArticleEditFocusTarget,
  refs: {
    categoryFieldRef: RefObject<HTMLDivElement | null>;
    contentTextareaRef: RefObject<HTMLTextAreaElement | null>;
    coverImageAltInputRef: RefObject<HTMLInputElement | null>;
    coverImageInputRef: RefObject<HTMLInputElement | null>;
    metaDescriptionTextareaRef: RefObject<HTMLTextAreaElement | null>;
    metaTitleInputRef: RefObject<HTMLInputElement | null>;
    slugInputRef: RefObject<HTMLInputElement | null>;
    summaryTextareaRef: RefObject<HTMLTextAreaElement | null>;
    tagsFieldRef: RefObject<HTMLDivElement | null>;
    titleInputRef: RefObject<HTMLInputElement | null>;
  },
) {
  const targetElementByName: Record<
    ArticleEditFocusTarget,
    HTMLElement | null
  > = {
    category: refs.categoryFieldRef.current,
    content: refs.contentTextareaRef.current,
    coverImage: refs.coverImageInputRef.current,
    coverImageAlt: refs.coverImageAltInputRef.current,
    metaDescription: refs.metaDescriptionTextareaRef.current,
    metaTitle: refs.metaTitleInputRef.current,
    slug: refs.slugInputRef.current,
    summary: refs.summaryTextareaRef.current,
    tags: refs.tagsFieldRef.current,
    title: refs.titleInputRef.current,
  };
  const targetElement = targetElementByName[target];

  if (!targetElement) {
    return;
  }

  targetElement.scrollIntoView({ block: "center", behavior: "smooth" });

  window.setTimeout(() => {
    const focusableElement =
      targetElement instanceof HTMLInputElement ||
      targetElement instanceof HTMLTextAreaElement
        ? targetElement
        : targetElement.querySelector<HTMLElement>(
            "input, textarea, button:not(:disabled)",
          );

    focusableElement?.focus();
  }, 220);
}

function normalizeOptionalText(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
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
