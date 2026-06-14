import type { GlobalRole } from "@/features/profile/types/profile";

export const GLOBAL_ADMIN_ROLE_VALUES = ["OWNER", "SUPER_ADMIN"] as const;

export function isGlobalAdminRole(
  role: GlobalRole | string | null | undefined,
) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}
