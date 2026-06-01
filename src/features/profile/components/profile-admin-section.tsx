"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordValues,
  type UpdateProfileValues,
} from "@/features/profile/schemas/profile.schema";
import {
  updatePassword,
  updateProfile,
  uploadAvatar,
} from "@/features/profile/services/profile.service";
import type { ProfileView } from "@/features/profile/types/profile";

type ActionStatus = "idle" | "success" | "error";

type ActionMessage = {
  status: ActionStatus;
  text: string | null;
};

const emptyMessage: ActionMessage = {
  status: "idle",
  text: null,
};

const TOAST_DISPLAY_DURATION_IN_MS = 5000;
const TOAST_EXIT_DURATION_IN_MS = 220;

export function ProfileAdminSection({
  mode,
  userId,
  userEmail,
  initialProfile,
  onProfileChange,
}: {
  mode: "edit" | "security";
  userId: string;
  userEmail: string;
  initialProfile: ProfileView | null;
  onProfileChange: (profile: ProfileView) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(initialProfile);
  const [profileMessage, setProfileMessage] =
    useState<ActionMessage>(emptyMessage);
  const [avatarMessage, setAvatarMessage] =
    useState<ActionMessage>(emptyMessage);
  const [passwordMessage, setPasswordMessage] =
    useState<ActionMessage>(emptyMessage);
  const [visibleToastMessage, setVisibleToastMessage] =
    useState<ActionMessage>(emptyMessage);
  const [isToastLeaving, setIsToastLeaving] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<
    string | null
  >(null);
  const [hasAvatarImageError, setHasAvatarImageError] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const {
    formState: { errors: profileErrors },
    handleSubmit: handleProfileSubmit,
    register: registerProfile,
    reset: resetProfile,
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      first_name: initialProfile?.first_name ?? "",
      last_name: initialProfile?.last_name ?? "",
    },
  });

  const {
    formState: { errors: passwordErrors },
    handleSubmit: handlePasswordSubmit,
    register: registerPassword,
    reset: resetPassword,
    setError: setPasswordError,
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      currentPassword: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  useEffect(() => {
    setProfile(initialProfile);
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
    setHasAvatarImageError(false);
    resetProfile({
      first_name: initialProfile?.first_name ?? "",
      last_name: initialProfile?.last_name ?? "",
    });
  }, [initialProfile, resetProfile]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  const displayName = useMemo(() => {
    const fullName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || userEmail;
  }, [profile?.first_name, profile?.last_name, userEmail]);

  const initials = useMemo(() => {
    const parts = displayName.split(/[ @._-]/).filter(Boolean);
    const firstInitial = parts[0]?.[0] ?? "A";
    const secondInitial = parts[1]?.[0] ?? "";

    return `${firstInitial}${secondInitial}`.toUpperCase();
  }, [displayName]);

  const avatarImageSource = pendingAvatarPreviewUrl ?? profile?.avatarDisplayUrl;
  const toastMessage =
    profileMessage.text !== null
      ? profileMessage
      : avatarMessage.text !== null
        ? avatarMessage
        : passwordMessage;

  useEffect(() => {
    if (!toastMessage.text) {
      return;
    }

    setVisibleToastMessage(toastMessage);
    setIsToastLeaving(false);

    const exitTimer = window.setTimeout(() => {
      setIsToastLeaving(true);
    }, TOAST_DISPLAY_DURATION_IN_MS);
    const clearTimer = window.setTimeout(() => {
      setVisibleToastMessage(emptyMessage);
      setProfileMessage(emptyMessage);
      setAvatarMessage(emptyMessage);
      setPasswordMessage(emptyMessage);
      setIsToastLeaving(false);
    }, TOAST_DISPLAY_DURATION_IN_MS + TOAST_EXIT_DURATION_IN_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [toastMessage]);

  async function saveProfile(values: UpdateProfileValues) {
    setIsSavingProfile(true);
    setProfileMessage(emptyMessage);

    try {
      let updatedProfile = await updateProfile(userId, values);

      if (pendingAvatarFile) {
        updatedProfile = await uploadAvatar(userId, pendingAvatarFile);
      }

      setProfile(updatedProfile);
      onProfileChange(updatedProfile);
      setPendingAvatarFile(null);
      setPendingAvatarPreviewUrl(null);
      resetProfile({
        first_name: updatedProfile.first_name ?? "",
        last_name: updatedProfile.last_name ?? "",
      });
      setProfileMessage({
        status: "success",
        text: "Profil mis à jour avec succès.",
      });
    } catch (error) {
      setProfileMessage({
        status: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer le profil.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleAvatarChange(file: File | undefined) {
    if (!file) {
      return;
    }

    setAvatarMessage(emptyMessage);

    if (pendingAvatarPreviewUrl) {
      URL.revokeObjectURL(pendingAvatarPreviewUrl);
    }

    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl(URL.createObjectURL(file));
    setHasAvatarImageError(false);

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  async function savePassword(values: ChangePasswordValues) {
    setIsUpdatingPassword(true);
    setPasswordMessage(emptyMessage);

    try {
      await updatePassword(userEmail, values);
      resetPassword({
        currentPassword: "",
        password: "",
        passwordConfirmation: "",
      });
      setPasswordMessage({
        status: "success",
        text: "Mot de passe modifié avec succès.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Impossible de modifier le mot de passe.";

      if (errorMessage === "Le mot de passe actuel est incorrect.") {
        setPasswordError("currentPassword", {
          type: "manual",
          message: errorMessage,
        });
        return;
      }

      setPasswordMessage({
        status: "error",
        text: errorMessage,
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  if (!profile) {
    return (
      <section className="profile-section-in flex min-h-full items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-[#2d2e30] dark:bg-[#141517]">
          <AlertCircle
            className="mx-auto h-8 w-8 text-[#f44336] dark:text-[#ff8a3d]"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-semibold text-stone-950 dark:text-white">
            Profil introuvable
          </h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Le profil associe a cet utilisateur n'a pas ete retourne par
            Supabase.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-section-in min-h-full pt-6">
      <ToastMessageView
        isLeaving={isToastLeaving}
        message={visibleToastMessage}
      />

      <div
        key={mode}
        className="profile-title-in mb-[70px] w-[300px] border-b border-stone-200 bg-white px-0 pb-3 dark:border-[#2d2e30] dark:bg-transparent"
      >
        <h2 className="text-lg font-bold text-stone-950 dark:text-white">
          {mode === "edit" ? "Modifier mon profil" : "Securite"}
        </h2>
      </div>

      <div className="mx-auto w-full max-w-3xl overflow-hidden">
        <div className="py-10 sm:py-12">
          {mode === "edit" ? (
            <>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="h-32 w-32 overflow-hidden rounded-full border border-[#b9addf] bg-white shadow-sm dark:border-[#4b4267] dark:bg-[#151617]">
                    {avatarImageSource && !hasAvatarImageError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarImageSource}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        onError={() => setHasAvatarImageError(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-stone-500 dark:text-stone-300">
                        {initials}
                      </div>
                    )}
                  </div>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      void handleAvatarChange(event.target.files?.[0])
                    }
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-1 right-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#f44336] text-white shadow-md transition-transform duration-200 hover:scale-105 hover:bg-[#d93025] dark:bg-[#ff8a3d] dark:text-[#111213] dark:hover:bg-[#ff7a1f]"
                    aria-label="Uploader un avatar"
                    title="Uploader"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

              </div>

              <form
                onSubmit={handleProfileSubmit(saveProfile)}
                className="mx-auto mt-10 flex w-full flex-col gap-7"
              >
                <TextField
                  label="Prenom"
                  disabled={isSavingProfile}
                  error={profileErrors.first_name?.message}
                  {...registerProfile("first_name")}
                />
                <TextField
                  label="Nom"
                  disabled={isSavingProfile}
                  error={profileErrors.last_name?.message}
                  {...registerProfile("last_name")}
                />

                <ReadOnlyField label="Email" value={userEmail} />

                <div className="flex justify-end pt-5">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex h-11 min-w-40 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#d93025] disabled:translate-y-0 disabled:cursor-wait disabled:bg-stone-300 dark:bg-[#ff8a3d] dark:text-[#111213] dark:hover:bg-[#ff7a1f] dark:disabled:bg-stone-700 dark:disabled:text-stone-400"
                  >
                    {isSavingProfile ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    Enregistrer
                  </button>
                </div>
              </form>
            </>
          ) : (
            <form
              onSubmit={handlePasswordSubmit(savePassword)}
              className="mx-auto flex w-full flex-col gap-7"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#f44336] shadow-sm dark:bg-[#151617] dark:text-[#ff8a3d]">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold text-stone-950 dark:text-white">
                  Modifier le mot de passe
                </h3>
              </div>

              <PasswordField
                label="Mot de passe actuel"
                autoComplete="current-password"
                disabled={isUpdatingPassword}
                error={passwordErrors.currentPassword?.message}
                {...registerPassword("currentPassword")}
              />
              <PasswordField
                label="Nouveau mot de passe"
                autoComplete="new-password"
                disabled={isUpdatingPassword}
                error={passwordErrors.password?.message}
                {...registerPassword("password")}
              />
              <PasswordField
                label="Confirmation"
                autoComplete="new-password"
                disabled={isUpdatingPassword}
                error={passwordErrors.passwordConfirmation?.message}
                {...registerPassword("passwordConfirmation")}
              />

              <div className="flex justify-end pt-5">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="inline-flex h-11 min-w-52 cursor-pointer items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-5 text-sm font-semibold text-[#f44336] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-50 disabled:translate-y-0 disabled:cursor-wait disabled:bg-stone-100 disabled:text-stone-400 dark:border-[#2d2e30] dark:bg-[#151617] dark:text-[#ff8a3d] dark:hover:bg-[#18191b] dark:disabled:bg-[#1c1d20] dark:disabled:text-stone-600"
                >
                  {isUpdatingPassword ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  )}
                  Modifier le mot de passe
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  error,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        {label}
      </span>
      <input
        type="text"
        className="mt-2 h-11 w-full rounded-md border border-stone-200 bg-stone-50 px-4 text-sm text-stone-950 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f44336] focus:ring-4 focus:ring-[#f44336]/10 disabled:cursor-wait disabled:bg-stone-100 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:focus:border-[#ff8a3d] dark:focus:ring-[#ff8a3d]/10 dark:disabled:bg-[#111213]"
        {...inputProps}
      />
      {error ? (
        <span className="mt-2 block text-sm font-medium text-[#d93025] dark:text-[#ff6b6b]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block" aria-readonly="true">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
          {label}
        </span>
        <span className="group relative inline-flex items-center">
          <button
            type="button"
            className="inline-flex h-4 w-4 cursor-help items-center justify-center text-[#f44336] outline-none transition-colors hover:text-[#d93025] focus-visible:text-[#d93025] dark:text-[#ff8a3d] dark:hover:text-[#ffb16f] dark:focus-visible:text-[#ffb16f]"
            aria-label="Information sur la modification de l'email"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="pointer-events-none absolute left-6 top-1/2 z-20 w-72 -translate-y-1/2 rounded-md border border-[#f44336]/20 bg-[#f44336] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg shadow-[#f44336]/15 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-[#ff8a3d]/30 dark:bg-[#ff8a3d] dark:text-[#111213] dark:shadow-[#ff8a3d]/10">
            Pour modifier votre email, rapprochez-vous de l'administrateur.
          </span>
        </span>
      </div>
      <div className="mt-2 flex h-11 cursor-default items-center rounded-md border border-dashed border-stone-300 bg-stone-100 px-4 text-sm text-stone-500 dark:border-[#3a3b3d] dark:bg-[#111213] dark:text-stone-400">
        <span className="min-w-0 flex-1 truncate">{value}</span>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  error,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        {label}
      </span>
      <input
        type="password"
        className="mt-2 h-11 w-full rounded-md border border-stone-200 bg-stone-50 px-4 text-sm text-stone-950 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f44336] focus:ring-4 focus:ring-[#f44336]/10 disabled:cursor-wait disabled:bg-stone-100 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:focus:border-[#ff8a3d] dark:focus:ring-[#ff8a3d]/10 dark:disabled:bg-[#111213]"
        {...inputProps}
      />
      {error ? (
        <span className="mt-2 block text-sm font-medium text-[#d93025] dark:text-[#ff6b6b]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function ToastMessageView({
  isLeaving,
  message,
}: {
  isLeaving: boolean;
  message: ActionMessage;
}) {
  if (!message.text || message.status === "idle") {
    return null;
  }

  const isSuccess = message.status === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={[
        "fixed bottom-5 left-1/2 z-20 w-[calc(100dvw-2rem)] max-w-sm md:absolute md:bottom-auto md:left-auto md:right-1 md:top-6 md:w-auto",
        isLeaving ? "profile-toast-out" : "profile-toast-in",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg dark:shadow-white/5",
          isLeaving ? "" : "profile-toast-float",
          isSuccess
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-[#b42318] dark:border-[#5f2a20] dark:bg-[#241412] dark:text-[#ffb199]",
        ].join(" ")}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message.text}</span>
      </div>
    </div>
  );
}
