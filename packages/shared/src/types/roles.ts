// Canonical role set for the rebuild. Keep this aligned with docs/identity-model.md.
export const USER_ROLES = ['student', 'parent', 'guardian', 'counselor'] as const

export type UserRole = (typeof USER_ROLES)[number]
