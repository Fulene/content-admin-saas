export const SITE_STATUS_VALUES = ["active", "disabled"] as const;

export type SiteStatus = (typeof SITE_STATUS_VALUES)[number];

export type Site = {
  id: string;
  name: string;
  currentUserRole: {
    code: string;
    id: string;
    label: string;
  } | null;
  slug: string | null;
  status: SiteStatus;
};

export type ManagedSite = Site & {
  memberCount: number;
};
