import "server-only";

import { ZodError } from "zod";
import { articleCreateSchema } from "@/features/articles/schemas/article-create.schema";
import { articleSchema } from "@/features/articles/schemas/article.schema";
import type { Article } from "@/features/articles/types/article";
import { isGlobalAdminRole } from "@/features/profile/utils/global-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

const ARTICLE_IMAGES_BUCKET_NAME = "article-images";
const MAX_ARTICLE_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;
const ACCEPTED_ARTICLE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type CreateArticleWithTagsForCurrentUserInput = {
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

type SiteMemberRoleRow = {
  roles: { code: string } | { code: string }[] | null;
};

export async function createArticleWithTagsForCurrentUser({
  siteId,
  status,
  coverImageFile,
  ...values
}: CreateArticleWithTagsForCurrentUserInput): Promise<Article> {
  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  const parsedValues = articleCreateSchema.parse(values);
  const userId = await ensureCanManageContentForCurrentUser(siteId);
  const supabase = createAdminClient();
  let uploadedImagePath: string | null = null;
  let createdArticleId: string | null = null;

  try {
    await ensureSiteIsActive(siteId);
    await ensureCategoryBelongsToSite({
      categoryId: parsedValues.categoryId,
      siteId,
    });

    const tagIds = [...new Set(parsedValues.tagIds)];
    await ensureTagsBelongToSite({ siteId, tagIds });

    if (coverImageFile) {
      validateArticleImageFile(coverImageFile);

      const imagePath = createArticleImageStoragePath(siteId, coverImageFile);
      const imageBuffer = Buffer.from(await coverImageFile.arrayBuffer());
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(ARTICLE_IMAGES_BUCKET_NAME)
        .upload(imagePath, imageBuffer, {
          contentType: coverImageFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedImagePath = uploadData.path;
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        author_id: userId,
        category_id: parsedValues.categoryId,
        content: parsedValues.content,
        cover_image_alt: normalizeOptionalText(parsedValues.coverImageAlt),
        cover_image_url: uploadedImagePath,
        meta_description: normalizeOptionalText(parsedValues.metaDescription),
        meta_title: normalizeOptionalText(parsedValues.metaTitle),
        published_at: status === "published" ? new Date().toISOString() : null,
        site_id: siteId,
        slug: parsedValues.slug,
        status,
        summary: parsedValues.summary,
        title: parsedValues.title,
        updated_by: userId,
      })
      .select(ARTICLES_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const article = articleSchema.parse(data);
    createdArticleId = article.id;

    if (tagIds.length > 0) {
      const { error: tagsError } = await supabase.from("article_tags").insert(
        tagIds.map((tagId) => ({
          article_id: article.id,
          site_id: siteId,
          tag_id: tagId,
        })),
      );

      if (tagsError) {
        throw new Error(tagsError.message);
      }
    }

    return article;
  } catch (error) {
    if (createdArticleId) {
      await cleanupCreatedArticle(createdArticleId);
    }

    if (uploadedImagePath) {
      await cleanupUploadedArticleImage(uploadedImagePath);
    }

    if (error instanceof ZodError) {
      throw new Error(error.issues[0]?.message ?? "Formulaire invalide.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de creer l'article.");
  }
}

async function cleanupCreatedArticle(articleId: string) {
  const supabase = createAdminClient();

  try {
    await supabase.from("article_tags").delete().eq("article_id", articleId);
    await supabase.from("articles").delete().eq("id", articleId);
  } catch {
    // Keep the original mutation error visible to the caller.
  }
}

async function cleanupUploadedArticleImage(path: string) {
  const supabase = createAdminClient();

  try {
    await supabase.storage.from(ARTICLE_IMAGES_BUCKET_NAME).remove([path]);
  } catch {
    // Keep the original mutation error visible to the caller.
  }
}

async function ensureCanManageContentForCurrentUser(siteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("Utilisateur non authentifie.");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (isGlobalAdminRole(profileData?.global_role)) {
    return user.id;
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("site_members")
    .select("roles(code)")
    .eq("site_id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as SiteMemberRoleRow | null;
  const role = Array.isArray(row?.roles) ? (row.roles[0] ?? null) : row?.roles;
  const roleCode = role?.code.toUpperCase() ?? "";

  if (roleCode !== "ADMIN" && roleCode !== "EDITOR") {
    throw new Error("Acces refuse.");
  }

  return user.id;
}

async function ensureSiteIsActive(siteId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select("status")
    .eq("id", siteId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.status !== "active") {
    throw new Error("Site actif introuvable.");
  }
}

async function ensureCategoryBelongsToSite({
  categoryId,
  siteId,
}: {
  categoryId: string | null;
  siteId: string;
}) {
  if (!categoryId) {
    return;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Categorie invalide pour ce site.");
  }
}

async function ensureTagsBelongToSite({
  siteId,
  tagIds,
}: {
  siteId: string;
  tagIds: string[];
}) {
  if (tagIds.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .eq("site_id", siteId)
    .in("id", tagIds);

  if (error) {
    throw new Error(error.message);
  }

  if ((data ?? []).length !== tagIds.length) {
    throw new Error("Tags invalides pour ce site.");
  }
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

function normalizeOptionalText(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}
