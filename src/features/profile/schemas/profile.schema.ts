import { z } from "zod";
import {
  GLOBAL_ROLE_VALUES,
  type Profile,
} from "@/features/profile/types/profile";

const timestampSchema = z.string().datetime({ offset: true });

export const profileSchema: z.ZodType<Profile> = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  global_role: z.enum(GLOBAL_ROLE_VALUES).nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const updateProfileSchema = z.object({
  first_name: z.string().trim().max(80, "80 caracteres maximum."),
  last_name: z.string().trim().max(80, "80 caracteres maximum."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel obligatoire."),
    password: z
      .string()
      .min(8, "8 caracteres minimum.")
      .regex(/[A-Z]/, "Une majuscule est obligatoire.")
      .regex(/[0-9]/, "Un chiffre est obligatoire.")
      .regex(/[^A-Za-z0-9]/, "Un symbole est obligatoire."),
    passwordConfirmation: z.string().min(1, "Confirmation obligatoire."),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Les deux mots de passe doivent correspondre.",
    path: ["passwordConfirmation"],
  });

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
