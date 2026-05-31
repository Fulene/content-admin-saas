"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { createClient } from "@/lib/supabase/server";

export type LoginActionState = {
  errorMessage: string | null;
};

const invalidLoginState: LoginActionState = {
  errorMessage: "Email ou mot de passe invalide.",
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsedCredentials = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedCredentials.success) {
    return invalidLoginState;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(
    parsedCredentials.data,
  );

  if (error) {
    return invalidLoginState;
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/admin");
  redirect("/login");
}
