import { ZodError } from "zod";
import { tagListSchema, tagSchema } from "@/features/tags/schemas/tag.schema";
import type { Tag } from "@/features/tags/types/tag";

const TAGS_SELECT = ["id", "site_id", "name", "slug"].join(",");

export async function getTags(activeSiteId: string): Promise<Tag[]> {
  if (!activeSiteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data, error } = await supabase
      .from("tags")
      .select(TAGS_SELECT)
      .eq("site_id", activeSiteId)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return tagListSchema.parse(data ?? []);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Les tags retournes par Supabase sont invalides.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de charger les tags.");
  }
}

export async function createTag({
  name,
  siteId,
  slug,
}: {
  name: string;
  siteId: string;
  slug: string;
}): Promise<Tag> {
  if (!siteId) {
    throw new Error("Aucun site actif selectionne.");
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const normalizedName = normalizeTagName(name);
    const normalizedSlug = slug.trim().toLowerCase();

    const { data, error } = await supabase
      .from("tags")
      .insert({
        site_id: siteId,
        name: normalizedName,
        slug: normalizedSlug,
      })
      .select(TAGS_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return tagSchema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Le tag retourne par Supabase est invalide.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de creer le tag.");
  }
}

export async function updateTag({
  id,
  name,
  siteId,
  slug,
}: {
  id: string;
  name: string;
  siteId: string;
  slug: string;
}): Promise<Tag> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const normalizedName = normalizeTagName(name);
  const normalizedSlug = slug.trim().toLowerCase();

  const { data, error } = await supabase
    .from("tags")
    .update({ name: normalizedName, slug: normalizedSlug })
    .eq("site_id", siteId)
    .eq("id", id)
    .select(TAGS_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return tagSchema.parse(data);
}

export async function deleteTagForSite({
  id,
  siteId,
}: {
  id: string;
  siteId: string;
}): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const { error } = await supabase.rpc("delete_tag_for_site", {
    p_site_id: siteId,
    p_tag_id: id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeTagName(value: string) {
  return value.trim().toLowerCase();
}
