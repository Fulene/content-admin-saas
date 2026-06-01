import "server-only";

import { ZodError } from "zod";
import { profileSchema } from "@/features/profile/schemas/profile.schema";
import { createAvatarDisplayUrl } from "@/features/profile/services/profile-storage.service";
import type { ProfileView } from "@/features/profile/types/profile";
import { createClient } from "@/lib/supabase/server";

const PROFILE_SELECT = [
  "id",
  "first_name",
  "last_name",
  "avatar_url",
  "created_at",
  "updated_at",
].join(",");

export async function getProfileByUserId(
  userId: string,
): Promise<ProfileView | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    const profile = profileSchema.parse(data);
    const avatarDisplayUrl = await createAvatarDisplayUrl(
      supabase,
      profile.avatar_url,
    );

    return {
      ...profile,
      avatarDisplayUrl,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Le profil retourne par Supabase est invalide.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de charger le profil.");
  }
}
