import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET_NAME = "avatars";
export const MAX_AVATAR_SIZE_IN_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function getAvatarStoragePath(userId: string) {
  return `${userId}/avatar-${Date.now()}.webp`;
}

export function getStoredAvatarUrl(userId: string) {
  return `${AVATAR_BUCKET_NAME}/${getAvatarStoragePath(userId)}`;
}

export function getAvatarObjectPath(avatarUrl: string | null) {
  if (!avatarUrl) {
    return null;
  }

  if (avatarUrl.startsWith(`${AVATAR_BUCKET_NAME}/`)) {
    return avatarUrl.slice(AVATAR_BUCKET_NAME.length + 1);
  }

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return null;
  }

  return avatarUrl;
}

export async function createAvatarDisplayUrl(
  supabase: SupabaseClient,
  avatarUrl: string | null,
) {
  if (!avatarUrl) {
    return null;
  }

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  const objectPath = getAvatarObjectPath(avatarUrl);

  if (!objectPath) {
    return null;
  }

  const { data } = supabase.storage
    .from(AVATAR_BUCKET_NAME)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

export function validateAvatarFile(file: File) {
  if (!(ACCEPTED_AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Format invalide. Utilisez JPEG, PNG ou WebP.");
  }

  if (file.size > MAX_AVATAR_SIZE_IN_BYTES) {
    throw new Error("L'avatar ne doit pas depasser 5 MB.");
  }
}

export async function convertAvatarFileToWebp(file: File) {
  validateAvatarFile(file);

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxSize = 512;
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Impossible de preparer l'avatar.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Impossible de convertir l'avatar en WebP."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      0.9,
    );
  });
}
