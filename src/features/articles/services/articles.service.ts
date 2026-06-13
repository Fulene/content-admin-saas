import { ZodError } from "zod";
import {
  articleListSchema,
  articleSchema,
} from "@/features/articles/schemas/article.schema";
import type { Article } from "@/features/articles/types/article";
import type { Tag } from "@/features/tags/types/tag";

const ARTICLES_SELECT = [
  "id",
  "site_id",
  "author_id",
  "category_id",
  "title",
  "slug",
  "summary",
  "content",
  "cover_image_url",
  "cover_image_alt",
  "meta_title",
  "meta_description",
  "status",
  "published_at",
  "updated_by",
  "created_at",
  "updated_at",
].join(",");

export async function getArticles(activeSiteId: string): Promise<Article[]> {
  if (!activeSiteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLES_SELECT)
      .eq("site_id", activeSiteId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return articleListSchema.parse(data ?? []);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Les articles retournés par Supabase sont invalides.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de charger les articles.");
  }
}

type ArticleTagRow = {
  article_id: string;
  tags: Tag | Tag[] | null;
};

export async function getArticleTagsByArticleIds({
  articleIds,
  siteId,
}: {
  articleIds: string[];
  siteId: string;
}): Promise<Map<string, Tag[]>> {
  const tagsByArticleId = new Map(
    articleIds.map((articleId) => [articleId, [] as Tag[]]),
  );

  if (articleIds.length === 0) {
    return tagsByArticleId;
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const { data, error } = await supabase
    .from("article_tags")
    .select("article_id,tags(id,site_id,name,slug)")
    .in("article_id", articleIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ArticleTagRow[]) {
    const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;

    if (!tag || tag.site_id !== siteId) {
      continue;
    }

    tagsByArticleId.get(row.article_id)?.push(tag);
  }

  for (const tags of tagsByArticleId.values()) {
    tags.sort((firstTag, secondTag) =>
      firstTag.name.localeCompare(secondTag.name),
    );
  }

  return tagsByArticleId;
}

type CreateArticleWithTagsInput = {
  siteId: string;
  status: "draft" | "published";
  categoryId: string | null;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageFile: File | null;
  coverImageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  tagIds: string[];
};

const ARTICLE_IMAGES_BUCKET_NAME = "article-images";
const MAX_ARTICLE_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;
const ACCEPTED_ARTICLE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export async function createArticleImageDisplayUrl(path: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const objectPath = path.startsWith(`${ARTICLE_IMAGES_BUCKET_NAME}/`)
    ? path.slice(ARTICLE_IMAGES_BUCKET_NAME.length + 1)
    : path;
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data } = supabase.storage
    .from(ARTICLE_IMAGES_BUCKET_NAME)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

export async function createArticleWithTags({
  siteId,
  status,
  categoryId,
  title,
  slug,
  summary,
  content,
  coverImageFile,
  coverImageAlt,
  metaTitle,
  metaDescription,
  tagIds,
}: CreateArticleWithTagsInput): Promise<Article> {
  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  let uploadedImagePath: string | null = null;

  try {
    if (coverImageFile) {
      validateArticleImageFile(coverImageFile);

      const imagePath = createArticleImageStoragePath(siteId, coverImageFile);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(ARTICLE_IMAGES_BUCKET_NAME)
        .upload(imagePath, coverImageFile, {
          contentType: coverImageFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedImagePath = uploadData.path;
    }

    const { data, error } = await supabase.rpc("create_article_with_tags", {
      p_site_id: siteId,
      p_category_id: categoryId,
      p_title: title,
      p_slug: slug,
      p_summary: summary,
      p_content: content,
      p_cover_image_url: uploadedImagePath,
      p_cover_image_alt: coverImageAlt,
      p_meta_title: metaTitle,
      p_meta_description: metaDescription,
      p_tag_ids: tagIds,
      p_status: status,
    });

    if (error) {
      throw new Error(error.message);
    }

    return articleSchema.parse(data);
  } catch (error) {
    if (uploadedImagePath) {
      await supabase.storage
        .from(ARTICLE_IMAGES_BUCKET_NAME)
        .remove([uploadedImagePath]);
    }

    if (error instanceof ZodError) {
      throw new Error("L'article retourne par Supabase est invalide.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de creer l'article.");
  }
}

type UpdateArticleWithTagsInput = {
  articleId: string;
  siteId: string;
  status: "draft" | "published";
  categoryId: string | null;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageFile: File | null;
  currentCoverImageUrl: string | null;
  currentTagIds: string[];
  coverImageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  tagIds: string[];
};

export async function updateArticleWithTags({
  articleId,
  siteId,
  status,
  categoryId,
  title,
  slug,
  summary,
  content,
  coverImageFile,
  currentCoverImageUrl,
  currentTagIds,
  coverImageAlt,
  metaTitle,
  metaDescription,
  publishedAt,
  tagIds,
}: UpdateArticleWithTagsInput): Promise<Article> {
  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  let uploadedImagePath: string | null = null;

  try {
    if (coverImageFile) {
      validateArticleImageFile(coverImageFile);

      const imagePath = createArticleImageStoragePath(siteId, coverImageFile);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(ARTICLE_IMAGES_BUCKET_NAME)
        .upload(imagePath, coverImageFile, {
          contentType: coverImageFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedImagePath = uploadData.path;
    }

    const nextTagIds = [...new Set(tagIds)];
    const currentTagIdSet = new Set(currentTagIds);
    const nextTagIdSet = new Set(nextTagIds);
    const tagIdsToAdd = nextTagIds.filter((tagId) => !currentTagIdSet.has(tagId));
    const tagIdsToRemove = currentTagIds.filter(
      (tagId) => !nextTagIdSet.has(tagId),
    );

    if (tagIdsToAdd.length > 0) {
      const { error: insertTagsError } = await supabase
        .from("article_tags")
        .insert(
          tagIdsToAdd.map((tagId) => ({
            article_id: articleId,
            tag_id: tagId,
          })),
        );

      if (insertTagsError) {
        throw new Error(insertTagsError.message);
      }
    }

    if (tagIdsToRemove.length > 0) {
      const { error: deleteTagsError } = await supabase
        .from("article_tags")
        .delete()
        .eq("article_id", articleId)
        .in("tag_id", tagIdsToRemove);

      if (deleteTagsError) {
        throw new Error(deleteTagsError.message);
      }
    }

    const { data, error } = await supabase
      .from("articles")
      .update({
        category_id: categoryId,
        title,
        slug,
        summary,
        content,
        cover_image_url: uploadedImagePath ?? currentCoverImageUrl,
        cover_image_alt: coverImageAlt,
        meta_title: metaTitle,
        meta_description: metaDescription,
        published_at:
          status === "published"
            ? (publishedAt ?? new Date().toISOString())
            : null,
        status,
      })
      .eq("site_id", siteId)
      .eq("id", articleId)
      .select(ARTICLES_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (uploadedImagePath && currentCoverImageUrl) {
      await removeStoredArticleImage(currentCoverImageUrl);
    }

    return articleSchema.parse(data);
  } catch (error) {
    if (uploadedImagePath) {
      await removeStoredArticleImage(uploadedImagePath);
    }

    if (error instanceof ZodError) {
      throw new Error("L'article retourne par Supabase est invalide.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de modifier l'article.");
  }
}

export async function updateArticleStatus({
  article,
  siteId,
  status,
}: {
  article: Article;
  siteId: string;
  status: "draft" | "published";
}): Promise<Article> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const { data, error } = await supabase
    .from("articles")
    .update({
      published_at:
        status === "published"
          ? (article.published_at ?? new Date().toISOString())
          : null,
      status,
    })
    .eq("site_id", siteId)
    .eq("id", article.id)
    .select(ARTICLES_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return articleSchema.parse(data);
}

export async function deleteArticleForSite({
  article,
  siteId,
}: {
  article: Article;
  siteId: string;
}): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const { error: deleteTagsError } = await supabase
    .from("article_tags")
    .delete()
    .eq("article_id", article.id);

  if (deleteTagsError) {
    throw new Error(deleteTagsError.message);
  }

  const { error: deleteArticleError } = await supabase
    .from("articles")
    .delete()
    .eq("site_id", siteId)
    .eq("id", article.id);

  if (deleteArticleError) {
    throw new Error(deleteArticleError.message);
  }

  if (article.cover_image_url) {
    await removeStoredArticleImage(article.cover_image_url);
  }
}

async function removeStoredArticleImage(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return;
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  await supabase.storage.from(ARTICLE_IMAGES_BUCKET_NAME).remove([path]);
}

function validateArticleImageFile(file: File) {
  if (
    !(ACCEPTED_ARTICLE_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    throw new Error("Format d'image invalide. Utilisez JPEG, PNG ou WebP.");
  }

  if (file.size > MAX_ARTICLE_IMAGE_SIZE_IN_BYTES) {
    throw new Error("L'image ne doit pas depasser 5 MB.");
  }
}

function createArticleImageStoragePath(siteId: string, file: File) {
  const assetId = crypto.randomUUID();
  const extension = getFileExtensionForMimeType(file.type);
  const baseName = sanitizeArticleImageBaseName(file.name);

  return `sites/${siteId}/articles/${assetId}/${baseName}.${extension}`;
}

function sanitizeArticleImageBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalizedName = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedName || "image";
}

function getFileExtensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}
