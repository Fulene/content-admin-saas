export const GLOBAL_ROLE_VALUES = ["OWNER", "SUPER_ADMIN"] as const;

export type GlobalRole = (typeof GLOBAL_ROLE_VALUES)[number];

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  global_role: GlobalRole | null;
  created_at: string;
  updated_at: string;
};

export type ProfileView = Profile & {
  avatarDisplayUrl: string | null;
};
