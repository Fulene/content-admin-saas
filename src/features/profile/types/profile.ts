export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileView = Profile & {
  avatarDisplayUrl: string | null;
};
