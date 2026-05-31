import { ZodError } from "zod";
import { articleListSchema } from "@/features/articles/schemas/article.schema";
import type { Article } from "@/features/articles/types/article";

const ARTICLES_SELECT = [
  "id",
  "title",
  "slug",
  "summary",
  "content",
  "cover_image_url",
  "cover_image_alt",
  "seo_title",
  "seo_description",
  "category_name",
  "status",
  "published_at",
  "created_by",
  "created_at",
  "updated_by",
  "updated_at",
].join(",");

export async function getArticles(): Promise<Article[]> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error } = await supabase
      .from("articles")
      .select(ARTICLES_SELECT)
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
