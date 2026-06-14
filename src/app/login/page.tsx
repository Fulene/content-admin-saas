import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Connexion - content-admin-saas",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/admin");
  }

  return (
    <main className="dark flex min-h-screen items-center justify-center overflow-y-auto bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-base font-bold text-[#f44336] dark:text-[#ff8a3d]">
            content-admin-saas
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-950 dark:text-white">
            Connexion
          </h1>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-[#2d2e30] dark:bg-[#141517]">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
