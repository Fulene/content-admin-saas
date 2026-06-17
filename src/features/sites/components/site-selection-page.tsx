"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/branding/app-logo";
import { SelectDropdown } from "@/components/forms/select-dropdown";
import type { Site } from "@/features/sites/types/site";

const ACTIVE_SITE_STORAGE_PREFIX = "content-admin-saas-active-site";

export function SiteSelectionPage({
  shouldUseStoredSite = true,
  sites,
  userId,
}: {
  shouldUseStoredSite?: boolean;
  sites: Site[];
  userId: string;
}) {
  const router = useRouter();
  const [isCheckingStoredSite, setIsCheckingStoredSite] = useState(
    shouldUseStoredSite && sites.length > 1,
  );
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? "");

  useEffect(() => {
    if (!shouldUseStoredSite || sites.length <= 1) {
      setIsCheckingStoredSite(false);
      return;
    }

    const storedSiteId = window.localStorage.getItem(
      getActiveSiteStorageKey(userId),
    );
    const storedSite = sites.find((site) => site.id === storedSiteId);

    if (storedSite) {
      router.replace("/admin");
      return;
    }

    setIsCheckingStoredSite(false);
  }, [router, shouldUseStoredSite, sites, userId]);

  function openSelectedSite() {
    if (!selectedSiteId) {
      return;
    }

    window.localStorage.setItem(getActiveSiteStorageKey(userId), selectedSiteId);
    router.replace("/admin");
  }

  if (sites.length === 0) {
    return (
      <main className="dark flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
        <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-[#2d2e30] dark:bg-[#141517]">
          <AppLogo className="items-center" themeMode="dark" />
          <h1 className="mt-5 text-2xl font-bold">Aucun site disponible</h1>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-300">
            Votre compte ne dispose actuellement d'aucun site administrable.
          </p>
        </section>
      </main>
    );
  }

  if (isCheckingStoredSite) {
    return (
      <main className="dark flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
        <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-[#2d2e30] dark:bg-[#141517]">
          <AppLogo className="items-center" themeMode="dark" />
          <p className="mt-5 text-sm font-medium text-stone-500 dark:text-stone-300">
            Chargement du dernier site visité...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10 text-stone-950 dark:bg-[#090b0b] dark:text-stone-50">
      <section className="w-full max-w-xl">
        <div className="mb-6">
          <AppLogo themeMode="dark" />
          <h1 className="mt-5 text-2xl font-bold">Choisir un site</h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-300">
            Sélectionnez le site à administrer pour cette session.
          </p>
        </div>

        <div className="grid gap-3">
          <SelectDropdown
            ariaLabel="Choisir un site"
            buttonClassName="h-14 px-4 text-base"
            options={sites.map((site) => ({
              id: site.id,
              label: site.name,
            }))}
            placeholder="Choisir un site"
            value={selectedSiteId}
            onChange={setSelectedSiteId}
          />
          <button
            type="button"
            disabled={!selectedSiteId}
            onClick={openSelectedSite}
            className="inline-flex h-12 cursor-pointer items-center justify-center rounded-lg bg-[#f44336] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#d9342a] disabled:cursor-default disabled:bg-stone-300 disabled:text-stone-500 dark:bg-[#ff8a3d] dark:text-[#111213] dark:hover:bg-[#ff7a1f] dark:disabled:bg-stone-700 dark:disabled:text-stone-400"
          >
            Continuer
          </button>
        </div>
      </section>
    </main>
  );
}

function getActiveSiteStorageKey(userId: string) {
  return `${ACTIVE_SITE_STORAGE_PREFIX}:${userId}`;
}
