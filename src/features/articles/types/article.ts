export const ARTICLE_STATUS_VALUES = ["draft", "published"] as const;

export type ArticleStatus = (typeof ARTICLE_STATUS_VALUES)[number];

export type ArticleStatusFilter = "all" | ArticleStatus;

export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  category_name: string | null;
  status: ArticleStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
};
