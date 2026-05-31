"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  loginAction,
  type LoginActionState,
} from "@/features/auth/actions/auth.actions";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login.schema";

const initialState: LoginActionState = {
  errorMessage: null,
};

export function LoginForm() {
  const [actionState, formAction, isActionPending] = useActionState(
    loginAction,
    initialState,
  );
  const [isTransitionPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isPending = isActionPending || isTransitionPending;

  function submitLogin(values: LoginFormValues) {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(submitLogin)}
      className="flex w-full flex-col gap-5"
    >
      <div>
        <label
          htmlFor="email"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isPending}
          className="mt-2 h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 disabled:cursor-wait disabled:bg-stone-50 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d] dark:disabled:bg-[#111213]"
          {...register("email")}
        />
        {errors.email ? (
          <p className="mt-2 text-sm text-[#d93025] dark:text-[#ff8a3d]">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-sm font-medium text-stone-700 dark:text-stone-200"
        >
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isPending}
          className="mt-2 h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 disabled:cursor-wait disabled:bg-stone-50 dark:border-[#2d2e30] dark:bg-[#141517] dark:text-white dark:placeholder:text-stone-500 dark:focus:border-[#ff8a3d] dark:disabled:bg-[#111213]"
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-2 text-sm text-[#d93025] dark:text-[#ff8a3d]">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {actionState.errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318] dark:border-[#5f2a20] dark:bg-[#241412] dark:text-[#ffb199]">
          {actionState.errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#f44336] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#d93025] disabled:cursor-wait disabled:bg-stone-300 dark:bg-[#ff8a3d] dark:text-[#111213] dark:hover:bg-[#ff7a1f] dark:disabled:bg-stone-700 dark:disabled:text-stone-400"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
