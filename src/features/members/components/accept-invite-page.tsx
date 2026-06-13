"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import {
  acceptSiteInvitationAction,
  signInForInvitationAction,
  signUpForInvitationAction,
  type MemberActionResult,
} from "@/features/members/actions/members.actions";
import type { SiteInvitationCheck } from "@/features/members/types/member";

type AuthMode = "signin" | "signup";

export function AcceptInvitePage({
  invitationCheck,
  token,
}: {
  invitationCheck: SiteInvitationCheck;
  token: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const invitedEmail = invitationCheck.invitation?.email ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordConfirmationTouched, setPasswordConfirmationTouched] =
    useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [result, setResult] = useState<MemberActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const passwordValidation = validateInvitationPassword(
    password,
    passwordConfirmation,
  );
  const acceptedInvitation = result?.status === "success" ? result.invitation : null;
  const displayInvitationCheck: SiteInvitationCheck = acceptedInvitation
    ? {
        invitation: acceptedInvitation,
        reason: "success",
      }
    : invitationCheck;
  const canSubmit =
    invitedEmail.length > 0 &&
    (mode === "signin"
      ? password.length > 0
      : passwordValidation.length === 0);
  const isAccepted = Boolean(acceptedInvitation);
  const title = getInvitationTitle(displayInvitationCheck, isAccepted);
  const description = getInvitationDescription(displayInvitationCheck);
  const displayedInvitation =
    displayInvitationCheck.invitation ?? invitationCheck.invitation;
  const roleLabel = displayedInvitation?.roles
    ? getRoleDisplayLabel(displayedInvitation.roles)
    : null;
  const displayedSiteName = displayedInvitation?.sites?.name ?? null;
  const isReadyToAccept =
    displayInvitationCheck.reason === "success" && !acceptedInvitation;
  const shouldShowAuthForm =
    displayInvitationCheck.reason === "not_authenticated";

  function submitAuth() {
    if (!canSubmit || isPending) {
      setHasSubmitted(true);
      return;
    }

    setHasSubmitted(true);
    setResult(null);
    startTransition(async () => {
      const nextResult =
        mode === "signup"
          ? await signUpForInvitationAction({
              email: invitedEmail,
              password,
              passwordConfirmation,
              token,
            })
          : await signInForInvitationAction({
              email: invitedEmail,
              password,
              token,
            });

      setResult(nextResult);
    });
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setResult(null);
    setHasSubmitted(false);
    setPasswordConfirmationTouched(false);
  }

  function acceptInvitation() {
    if (isPending) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      setResult(await acceptSiteInvitationAction({ token }));
    });
  }

  return (
    <main className="flex h-dvh overflow-y-auto bg-[#090b0b] px-5 py-8 text-stone-50 sm:py-10">
      <section className="mx-auto my-auto w-full max-w-lg">
        <div className="mb-5">
          <p className="text-base font-bold text-[#ff8a3d]">
            content-admin-saas
          </p>
          {!shouldShowAuthForm ? (
            <>
              <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
              {!isAccepted ? (
                <p className="mt-2 text-sm text-stone-300">
                  {description.prefix}
                  {description.siteName ? (
                    <strong className="font-semibold text-white">
                      {description.siteName}
                    </strong>
                  ) : null}
                  {description.suffix}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="rounded-xl border border-[#2d2e30] bg-[#141517] p-5 shadow-sm">
          {displayedInvitation ? (
            <div className="mb-5 rounded-lg border border-[#2d2e30] bg-[#111213] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Invitation
              </p>
              <p className="mt-1 text-sm text-stone-400">
                Site :{" "}
                <span className="font-medium text-stone-200">
                  {displayedSiteName ?? "-"}
                </span>
              </p>
              <p className="mt-1 text-sm text-stone-400">
                Rôle :{" "}
                <span className="font-medium text-stone-200">
                  {roleLabel ?? "-"}
                </span>
              </p>
            </div>
          ) : null}

          {shouldShowAuthForm ? (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#111213] p-1">
                <button
                  type="button"
                  onClick={() => selectMode("signup")}
                  className={[
                    "h-10 cursor-pointer rounded-md text-sm font-semibold transition-colors",
                    mode === "signup"
                      ? "bg-[#24262a] text-white shadow-sm"
                      : "text-stone-400 hover:text-white",
                  ].join(" ")}
                >
                  Creer un compte
                </button>
                <button
                  type="button"
                  onClick={() => selectMode("signin")}
                  className={[
                    "h-10 cursor-pointer rounded-md text-sm font-semibold transition-colors",
                    mode === "signin"
                      ? "bg-[#24262a] text-white shadow-sm"
                      : "text-stone-400 hover:text-white",
                  ].join(" ")}
                >
                  J'ai deja un compte
                </button>
              </div>

              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAuth();
                }}
              >
              <InviteAuthFields
                email={invitedEmail}
                isPending={isPending}
                mode={mode}
                password={password}
                passwordConfirmation={passwordConfirmation}
                shouldShowErrors={hasSubmitted || passwordConfirmationTouched}
                onPasswordChange={setPassword}
                onPasswordConfirmationBlur={() =>
                  setPasswordConfirmationTouched(true)
                }
                onPasswordConfirmationChange={setPasswordConfirmation}
              />

              {mode === "signup" ? (
                <p className="rounded-md border border-[#2d2e30] bg-[#111213] px-3 py-2 text-xs leading-5 text-stone-400">
                  Une fois dans l'administration, tu pourras compléter ton profil depuis :
                  <span className="mt-1 block font-semibold text-stone-200">
                    Mon profil &gt; Modifier mon profil
                  </span>
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit || isPending}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#ff8a3d] px-4 text-sm font-semibold text-[#111213] transition-colors hover:bg-[#ff7a1f] disabled:cursor-default disabled:bg-stone-700 disabled:text-stone-400"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : mode === "signup" ? (
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                {mode === "signup"
                  ? "Creer mon compte"
                  : "Me connecter et accepter"}
              </button>
              </form>
            </div>
          ) : null}

          {isReadyToAccept ? (
            <button
              type="button"
              disabled={isPending}
              onClick={acceptInvitation}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#ff8a3d] px-4 text-sm font-semibold text-[#111213] transition-colors hover:bg-[#ff7a1f] disabled:cursor-default disabled:bg-stone-700 disabled:text-stone-400"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              Accepter l'invitation
            </button>
          ) : null}

          {result ? (
            <p
              className={[
                "mt-5 rounded-md border px-3 py-2 text-sm font-medium",
                result.status === "success"
                  ? "border-emerald-400/35 bg-[#10251d] text-emerald-100"
                  : "border-[#ff8a3d]/35 bg-[#2a1815] text-[#ffe7e2]",
              ].join(" ")}
            >
              {result.text}
            </p>
          ) : null}

          {isAccepted ? (
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="mt-4 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[#ff8a3d] px-4 text-sm font-semibold text-[#111213] transition-colors hover:bg-[#ff7a1f]"
            >
              Aller a l'administration
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function InviteAuthFields({
  email,
  isPending,
  mode,
  password,
  passwordConfirmation,
  shouldShowErrors,
  onPasswordChange,
  onPasswordConfirmationBlur,
  onPasswordConfirmationChange,
}: {
  email: string;
  isPending: boolean;
  mode: AuthMode;
  password: string;
  passwordConfirmation: string;
  shouldShowErrors: boolean;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationBlur: () => void;
  onPasswordConfirmationChange: (value: string) => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false);

  return (
    <div className="grid gap-4">
      <label>
        <span className="text-sm font-medium text-stone-200">
          Email
        </span>
        <div className="mt-2 flex h-11 cursor-default items-center rounded-md border border-dashed border-[#3a3b3d] bg-[#111213] px-3 text-sm text-stone-300">
          <span className="min-w-0 flex-1 truncate">{email}</span>
        </div>
      </label>

      <label>
        <span className="text-sm font-medium text-stone-200">
          Mot de passe
        </span>
        <div className="relative mt-2">
          <input
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            disabled={isPending}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="h-11 w-full rounded-md border border-[#2d2e30] bg-[#141517] px-3 pr-11 text-sm text-white outline-none transition-colors placeholder:text-stone-500 focus:border-[#ff8a3d] disabled:cursor-wait disabled:bg-[#111213]"
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((value) => !value)}
            disabled={isPending}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-[#18191b] hover:text-white disabled:cursor-wait disabled:opacity-60"
            aria-label={
              isPasswordVisible
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          8 caracteres minimum, une majuscule, un chiffre et un symbole.
        </p>
      </label>

      {mode === "signup" ? (
        <label>
          <span className="text-sm font-medium text-stone-200">
            Confirmation du mot de passe
          </span>
          <div className="relative mt-2">
            <input
              type={isPasswordConfirmationVisible ? "text" : "password"}
              autoComplete="new-password"
              disabled={isPending}
              value={passwordConfirmation}
              onBlur={onPasswordConfirmationBlur}
              onChange={(event) =>
                onPasswordConfirmationChange(event.target.value)
              }
              className="h-11 w-full rounded-md border border-[#2d2e30] bg-[#141517] px-3 pr-11 text-sm text-white outline-none transition-colors placeholder:text-stone-500 focus:border-[#ff8a3d] disabled:cursor-wait disabled:bg-[#111213]"
            />
            <button
              type="button"
              onClick={() =>
                setIsPasswordConfirmationVisible((value) => !value)
              }
              disabled={isPending}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-[#18191b] hover:text-white disabled:cursor-wait disabled:opacity-60"
              aria-label={
                isPasswordConfirmationVisible
                  ? "Masquer la confirmation du mot de passe"
                  : "Afficher la confirmation du mot de passe"
              }
            >
              {isPasswordConfirmationVisible ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {shouldShowErrors ? (
            <PasswordValidationMessage
              password={password}
              passwordConfirmation={passwordConfirmation}
            />
          ) : null}
        </label>
      ) : null}
    </div>
  );
}

function PasswordValidationMessage({
  password,
  passwordConfirmation,
}: {
  password: string;
  passwordConfirmation: string;
}) {
  const [message] = validateInvitationPassword(
    password,
    passwordConfirmation,
  );

  return message ? (
    <span className="mt-2 block text-sm font-medium text-[#ff6b6b]">
      {message}
    </span>
  ) : null;
}

function getInvitationTitle(check: SiteInvitationCheck, isAccepted = false) {
  const siteName = check.invitation?.sites?.name ?? "ce site";

  if (isAccepted) {
    return `Invitation acceptee`;
  }

  if (check.reason === "success") {
    return `Invitation pour ${siteName}`;
  }

  if (check.reason === "not_authenticated") {
    return "Rejoindre un site";
  }

  return "Invitation indisponible";
}

function getInvitationDescription(check: SiteInvitationCheck): {
  prefix: string;
  siteName: string | null;
  suffix: string;
} {
  if (check.reason === "success") {
    const siteName = check.invitation?.sites?.name ?? "ce site";

    return {
      prefix: "Tu es invite a rejoindre l'administration du site ",
      siteName,
      suffix: ".",
    };
  }

  if (check.reason === "not_authenticated") {
    return {
      prefix:
        "Cree ton compte ou connecte-toi avec l'email invite pour accepter l'invitation.",
      siteName: null,
      suffix: "",
    };
  }

  if (check.reason === "wrong_email") {
    return {
      prefix: "Le compte connecte ne correspond pas a l'email invite.",
      siteName: null,
      suffix: "",
    };
  }

  if (check.reason === "expired") {
    return {
      prefix:
        "Cette invitation a expire. Demande un nouveau lien a l'administrateur.",
      siteName: null,
      suffix: "",
    };
  }

  if (check.reason === "status_mismatch") {
    return {
      prefix: "Cette invitation a deja ete utilisee ou annulee.",
      siteName: null,
      suffix: "",
    };
  }

  return {
    prefix: "Le lien d'invitation est invalide.",
    siteName: null,
    suffix: "",
  };
}

function validateInvitationPassword(
  password: string,
  passwordConfirmation: string,
): string[] {
  if (password.length < 8) {
    return ["8 caracteres minimum."];
  }

  if (!/[A-Z]/.test(password)) {
    return ["Une majuscule est obligatoire."];
  }

  if (!/[0-9]/.test(password)) {
    return ["Un chiffre est obligatoire."];
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return ["Un symbole est obligatoire."];
  }

  if (!passwordConfirmation) {
    return ["Confirmation obligatoire."];
  }

  if (password !== passwordConfirmation) {
    return ["Les deux mots de passe doivent correspondre."];
  }

  return [];
}

function getRoleDisplayLabel(role: { code: string; label: string }) {
  return isAdminRoleCode(role.code) ? "Admin" : role.label;
}

function isAdminRoleCode(code: string | null | undefined) {
  return code?.toUpperCase() === "ADMIN";
}
