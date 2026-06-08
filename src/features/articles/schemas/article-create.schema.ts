import { z } from "zod";

export const articleCreateSchema = z.object({
  title: z.string().trim().min(1, "Titre obligatoire."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug obligatoire.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Le slug doit contenir des lettres minuscules, chiffres et tirets.",
    ),
  summary: z.string().trim().min(1, "Résumé obligatoire."),
  content: z.string().trim().min(1, "Contenu obligatoire."),
  categoryId: z.string().uuid().nullable(),
  tagIds: z.array(z.string().uuid()),
  coverImageAlt: z.string().trim().nullable(),
  metaTitle: z.string().trim().nullable(),
  metaDescription: z.string().trim().nullable(),
});

export type ArticleCreateValues = z.infer<typeof articleCreateSchema>;
