"use server";

import { revalidatePath } from "next/cache";
import {
  createManagedSiteForCurrentUser,
  deleteManagedSiteForCurrentUser,
  getManagedSitesForCurrentUser,
  updateManagedSiteForCurrentUser,
  updateManagedSiteStatusForCurrentUser,
} from "@/features/sites/services/sites-management.server.service";
import type {
  ManagedSite,
  SiteStatus,
} from "@/features/sites/types/site";

export type SiteManagementActionResult = {
  site?: ManagedSite;
  status: "success" | "error";
  text: string;
};

export async function getManagedSitesAction(): Promise<ManagedSite[]> {
  return getManagedSitesForCurrentUser();
}

export async function createManagedSiteAction({
  name,
}: {
  name: string;
}): Promise<SiteManagementActionResult> {
  try {
    const site = await createManagedSiteForCurrentUser({ name });
    revalidatePath("/admin");
    revalidatePath("/select-site");

    return {
      site,
      status: "success",
      text: "Site cree avec succes.",
    };
  } catch (error) {
    return {
      status: "error",
      text: getActionErrorMessage(error, "Impossible de creer le site."),
    };
  }
}

export async function updateManagedSiteAction({
  name,
  siteId,
}: {
  name: string;
  siteId: string;
}): Promise<SiteManagementActionResult> {
  try {
    const site = await updateManagedSiteForCurrentUser({ name, siteId });
    revalidatePath("/admin");
    revalidatePath("/select-site");

    return {
      site,
      status: "success",
      text: "Site modifie avec succes.",
    };
  } catch (error) {
    return {
      status: "error",
      text: getActionErrorMessage(error, "Impossible de modifier le site."),
    };
  }
}

export async function updateManagedSiteStatusAction({
  siteId,
  status,
}: {
  siteId: string;
  status: SiteStatus;
}): Promise<SiteManagementActionResult> {
  try {
    const site = await updateManagedSiteStatusForCurrentUser({ siteId, status });
    revalidatePath("/admin");
    revalidatePath("/select-site");

    return {
      site,
      status: "success",
      text:
        status === "active"
          ? "Site reactive avec succes."
          : "Site desactive avec succes.",
    };
  } catch (error) {
    return {
      status: "error",
      text: getActionErrorMessage(error, "Impossible de modifier le statut."),
    };
  }
}

export async function deleteManagedSiteAction({
  siteId,
}: {
  siteId: string;
}): Promise<SiteManagementActionResult> {
  try {
    await deleteManagedSiteForCurrentUser(siteId);
    revalidatePath("/admin");
    revalidatePath("/select-site");

    return {
      status: "success",
      text: "Site supprime avec succes.",
    };
  } catch (error) {
    return {
      status: "error",
      text: getActionErrorMessage(error, "Impossible de supprimer le site."),
    };
  }
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
