import { z } from "zod";
import {
  SITE_STATUS_VALUES,
  type ManagedSite,
  type Site,
} from "@/features/sites/types/site";

const siteObjectSchema = z.object({
  currentUserRole: z
    .object({
      code: z.string().min(1),
      id: z.string().uuid(),
      label: z.string().min(1),
    })
    .nullable(),
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().nullable(),
  status: z.enum(SITE_STATUS_VALUES),
});

export const siteSchema: z.ZodType<Site> = siteObjectSchema;

export const siteListSchema = z.array(siteSchema);

export const managedSiteSchema: z.ZodType<ManagedSite> = siteObjectSchema.extend({
  memberCount: z.number().int().min(0),
});

export const managedSiteListSchema = z.array(managedSiteSchema);

export const siteNameInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caracteres.")
    .max(80, "Le nom ne doit pas depasser 80 caracteres."),
});
