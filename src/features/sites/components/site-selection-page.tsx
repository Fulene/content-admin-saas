"use client";

import { useRouter } from "next/navigation";
import type { Site } from "@/features/sites/types/site";

const ACTIVE_SITE_STORAGE_PREFIX = "content-admin-saas-active-site";

export function SiteSelectionPage({
  sites,
  userId,
}: {
  sites: Site[];
  userId: string;
}) {
  const router = useRouter();

  function selectSite(site: Site) {
    window.localStorage.setItem(getActiveSiteStorageKey(userId), site.id);
    router.replace("/admin");
  }

  if (sites.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
        <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-[#2d2e30] dark:bg-[#141517]">
          <p className="text-base font-bold text-[#f44336] dark:text-[#ff8a3d]">
            content-admin-saas
          </p>
          <h1 className="mt-3 text-2xl font-bold">Aucun site disponible</h1>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-300">
            Votre compte ne dispose actuellement d'aucun site administrable.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <section className="w-full max-w-xl">
        <div className="mb-6">
          <p className="text-base font-bold text-[#f44336] dark:text-[#ff8a3d]">
            content-admin-saas
          </p>
          <h1 className="mt-2 text-2xl font-bold">Choisir un site</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-300">
            Selectionnez le site a administrer pour cette session.
          </p>
        </div>

        <div className="grid gap-3">
          {sites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => selectSite(site)}
              className="rounded-lg border border-stone-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-[#f44336] hover:bg-red-50 dark:border-[#2d2e30] dark:bg-[#141517] dark:hover:border-[#ff8a3d] dark:hover:bg-[#24262a]"
            >
              <span className="block font-semibold text-stone-950 dark:text-white">
                {site.name}
              </span>
              <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">
                {site.slug ?? site.id}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function getActiveSiteStorageKey(userId: string) {
  return `${ACTIVE_SITE_STORAGE_PREFIX}:${userId}`;
}
