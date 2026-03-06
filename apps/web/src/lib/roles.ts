export const USER_ROLES = ["student", "parent", "counselor"] as const;

export type UserRole = (typeof USER_ROLES)[number];
