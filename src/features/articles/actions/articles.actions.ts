"use server";

import { revalidatePath } from "next/cache";
import { createArticleWithTagsForCurrentUser } from "@/features/articles/services/articles.server.service";
import type { Article } from "@/features/articles/types/article";

export type ArticleActionResult = {
  article?: Article;
  status: "success" | "error";
  text: string;
};

export async function createArticleAction(
  formData: FormData,
): Promise<ArticleActionResult> {
  try {
    const status = readArticleStatus(formData);
    const article = await createArticleWithTagsForCurrentUser({
      siteId: readString(formData, "siteId"),
      status,
      categoryId: readNullableString(formData, "categoryId"),
      title: readString(formData, "title"),
      slug: readString(formData, "slug"),
      summary: readString(formData, "summary"),
      content: readString(formData, "content"),
      coverImageFile: readOptionalFile(formData, "coverImageFile"),
      coverImageAlt: readNullableString(formData, "coverImageAlt"),
      metaTitle: readNullableString(formData, "metaTitle"),
      metaDescription: readNullableString(formData, "metaDescription"),
      tagIds: readStringArray(formData, "tagIds"),
    });

    revalidatePath("/admin");

    return {
      article,
      status: "success",
      text:
        status === "published"
          ? "Article publie avec succes."
          : "Brouillon cree avec succes.",
    };
  } catch (error) {
    return {
      status: "error",
      text:
        error instanceof Error
          ? error.message
          : "Impossible de creer l'article.",
    };
  }
}

function readArticleStatus(formData: FormData) {
  const status = readString(formData, "status");

  if (status !== "draft" && status !== "published") {
    throw new Error("Statut d'article invalide.");
  }

  return status;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    throw new Error("Formulaire invalide.");
  }

  return value;
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key).trim();

  return value ? value : null;
}

function readStringArray(formData: FormData, key: string) {
  const value = readString(formData, key);

  if (!value) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(value);

  if (
    !Array.isArray(parsedValue) ||
    !parsedValue.every((item) => typeof item === "string")
  ) {
    throw new Error("Formulaire invalide.");
  }

  return parsedValue;
}

function readOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}
