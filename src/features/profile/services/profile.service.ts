import { ZodError } from "zod";
import {
  changePasswordSchema,
  profileSchema,
  updateProfileSchema,
  type ChangePasswordValues,
  type UpdateProfileValues,
} from "@/features/profile/schemas/profile.schema";
import {
  AVATAR_BUCKET_NAME,
  convertAvatarFileToWebp,
  createAvatarDisplayUrl,
  getAvatarStoragePath,
  validateAvatarFile,
} from "@/features/profile/services/profile-storage.service";
import type { ProfileView } from "@/features/profile/types/profile";
import { createClient } from "@/lib/supabase/client";

const PROFILE_SELECT = [
  "id",
  "first_name",
  "last_name",
  "avatar_url",
  "created_at",
  "updated_at",
].join(",");

export async function updateProfile(
  userId: string,
  values: UpdateProfileValues,
): Promise<ProfileView> {
  try {
    const parsedValues = updateProfileSchema.parse(values);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: normalizeOptionalText(parsedValues.first_name),
        last_name: normalizeOptionalText(parsedValues.last_name),
      })
      .eq("id", userId)
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
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
    return handleProfileServiceError(error, "Impossible d'enregistrer le profil.");
  }
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<ProfileView> {
  try {
    validateAvatarFile(file);

    const supabase = createClient();
    const avatarBlob = await convertAvatarFileToWebp(file);
    const avatarPath = getAvatarStoragePath(userId);
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET_NAME)
      .upload(avatarPath, avatarBlob, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: currentProfileData, error: currentProfileError } =
      await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();

    if (currentProfileError) {
      throw new Error(currentProfileError.message);
    }

    const previousAvatarUrl =
      typeof currentProfileData.avatar_url === "string"
        ? currentProfileData.avatar_url
        : null;

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: `${AVATAR_BUCKET_NAME}/${avatarPath}`,
      })
      .eq("id", userId)
      .select(PROFILE_SELECT)
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const profile = profileSchema.parse(data);
    const previousAvatarPath = getDeletablePreviousAvatarPath(
      userId,
      previousAvatarUrl,
      avatarPath,
    );

    if (previousAvatarPath) {
      await supabase.storage.from(AVATAR_BUCKET_NAME).remove([
        previousAvatarPath,
      ]);
    }

    const avatarDisplayUrl = await createAvatarDisplayUrl(
      supabase,
      profile.avatar_url,
    );

    return {
      ...profile,
      avatarDisplayUrl: avatarDisplayUrl
        ? `${avatarDisplayUrl}${avatarDisplayUrl.includes("?") ? "&" : "?"}v=${Date.now()}`
        : null,
    };
  } catch (error) {
    return handleProfileServiceError(error, "Impossible d'uploader l'avatar.");
  }
}

export async function updatePassword(
  userEmail: string,
  values: ChangePasswordValues,
) {
  try {
    const parsedValues = changePasswordSchema.parse(values);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: parsedValues.currentPassword,
    });

    if (signInError) {
      throw new Error("Le mot de passe actuel est incorrect.");
    }

    const { error } = await supabase.auth.updateUser({
      password: parsedValues.password,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Le nouveau mot de passe est invalide.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible de modifier le mot de passe.");
  }
}

function normalizeOptionalText(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getDeletablePreviousAvatarPath(
  userId: string,
  previousAvatarUrl: string | null,
  newAvatarPath: string,
) {
  if (!previousAvatarUrl) {
    return null;
  }

  const prefix = `${AVATAR_BUCKET_NAME}/`;
  const previousAvatarPath = previousAvatarUrl.startsWith(prefix)
    ? previousAvatarUrl.slice(prefix.length)
    : previousAvatarUrl;

  if (
    previousAvatarPath === newAvatarPath ||
    !previousAvatarPath.startsWith(`${userId}/`)
  ) {
    return null;
  }

  return previousAvatarPath;
}

function handleProfileServiceError(error: unknown, fallbackMessage: string): never {
  if (error instanceof ZodError) {
    throw new Error("Le profil retourne par Supabase est invalide.");
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(fallbackMessage);
}
