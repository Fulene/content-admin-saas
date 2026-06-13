"use client";

import {
  type AnimationEvent,
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Plus, Send, UploadCloud, X } from "lucide-react";
import { ZodError } from "zod";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import {
  ToastMessage,
  type ToastMessageState,
} from "@/components/feedback/toast-message";
import { CreatableDropdown } from "@/components/forms/creatable-dropdown";
import { CreatableChipCombobox } from "@/components/forms/creatable-chip-combobox";
import {
  articleCreateSchema,
  type ArticleCreateValues,
} from "@/features/articles/schemas/article-create.schema";
import { createArticleWithTags } from "@/features/articles/services/articles.service";
import {
  createCategory,
  getCategories,
} from "@/features/categories/services/categories.service";
import type { Category } from "@/features/categories/types/category";
import { useActiveSite } from "@/features/sites/components/active-site-provider";
import { createTag, getTags } from "@/features/tags/services/tags.service";
import type { Tag } from "@/features/tags/types/tag";

type DrawerState = "idle" | "loading" | "success" | "error";

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

export function ArticleCreateDrawer({
  isOpen,
  onArticleCreated,
  onClose,
}: {
  isOpen: boolean;
  onArticleCreated: (message: ToastMessageState) => void;
  onClose: () => void;
}) {
  const { activeSiteId } = useActiveSite();
  const [values, setValues] = useState<ArticleCreateValues>(EMPTY_VALUES);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState<
    string | null
  >(null);
  const [isCoverImageDragActive, setIsCoverImageDragActive] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const [hasSlugBeenEdited, setHasSlugBeenEdited] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [drawerState, setDrawerState] = useState<DrawerState>("idle");
  const [metadataState, setMetadataState] = useState<DrawerState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const isDirty = useMemo(
    () =>
      values.title.trim().length > 0 ||
      values.slug.trim().length > 0 ||
      values.summary.trim().length > 0 ||
      values.content.trim().length > 0 ||
      values.categoryId !== null ||
      values.tagIds.length > 0 ||
      values.coverImageAlt !== null ||
      values.metaTitle !== null ||
      values.metaDescription !== null ||
      coverImageFile !== null,
    [coverImageFile, values],
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

  function resetForm() {
    setValues(EMPTY_VALUES);
    setCoverImageFile(null);
    setCoverImagePreviewUrl(null);
    setIsCoverImageDragActive(false);
    setHasSlugBeenEdited(false);
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
    setDrawerState("loading");
    setErrorMessage(null);

    try {
      const parsedValues = articleCreateSchema.parse(values);

      await createArticleWithTags({
        siteId: activeSiteId,
        status,
        categoryId: parsedValues.categoryId,
        title: parsedValues.title,
        slug: parsedValues.slug,
        summary: parsedValues.summary,
        content: parsedValues.content,
        coverImageFile,
        coverImageAlt: normalizeOptionalText(parsedValues.coverImageAlt),
        metaTitle: normalizeOptionalText(parsedValues.metaTitle),
        metaDescription: normalizeOptionalText(parsedValues.metaDescription),
        tagIds: parsedValues.tagIds,
      });

      setDrawerState("success");
      onArticleCreated({
        status: "success",
        text:
          status === "published"
            ? "Article publié avec succès."
            : "Brouillon créé avec succès.",
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
          : "Impossible de créer l'article.",
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

  if (!isDrawerMounted) {
    return null;
  }

  const backdropAnimationClass = isClosing
    ? "article-create-drawer-backdrop-out"
    : "article-create-drawer-backdrop-in";
  const drawerAnimationClass = isClosing
    ? "article-create-drawer-out"
    : "article-create-drawer-in";

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
              Nouvel article
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
                onChange={updateTitle}
              />

              <TextField
                label="Slug"
                value={values.slug}
                required
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
                rows={9}
                onChange={(content) =>
                  setValues((currentValues) => ({
                    ...currentValues,
                    content,
                  }))
                }
              />

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

              <TextField
                label="Meta title"
                value={values.metaTitle ?? ""}
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
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                      Le fichier sera utilisé comme image de couverture.
                    </span>
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
                      Dépose une image ici ou utilise le bouton de sélection.
                    </p>
                  </div>
                </div>

                {coverImagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImagePreviewUrl}
                    alt=""
                    className="h-40 w-full rounded-md object-cover"
                  />
                ) : null}

                <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                  {coverImageFile ? coverImageFile.name : "Aucun fichier sélectionné"}
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
                void handleSubmit("draft");
              }}
              className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-4 text-sm font-semibold text-white hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920] sm:w-auto"
            >
              {drawerState === "loading" ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              Creer le brouillon
            </button>
            <button
              type="button"
              disabled={drawerState === "loading" || metadataState !== "success"}
              onClick={() => {
                void handleSubmit("published");
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-default disabled:opacity-60"
            >
              {drawerState === "loading" ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Publier l'article
            </button>
          </footer>
        </form>
      </aside>

      <ConfirmDialog
        cancelLabel="Continuer l'edition"
        confirmLabel="Fermer sans créer"
        isDanger
        isOpen={isDiscardDialogOpen}
        title="Abandonner la creation ?"
        onCancel={() => setIsDiscardDialogOpen(false)}
        onConfirm={confirmClose}
      >
        Les informations saisies dans ce formulaire seront perdues.
      </ConfirmDialog>
    </div>
  );
}

function TextField({
  label,
  onChange,
  required = false,
  value,
}: {
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
  label,
  onChange,
  required = false,
  rows,
  value,
}: {
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
        value={value}
        required={required}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2d2e30] dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d]"
      />
    </label>
  );
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
