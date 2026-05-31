import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${details}`);
}

export const env = parsedEnv.data;
