export const FAMILY_LINK_CODE_LENGTH = 16

/**
 * Keeps handwritten and copied family-link codes equivalent without exposing a
 * database identifier to either the student or the parent.
 */
export function normalizeFamilyLinkCode(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

export function isValidFamilyLinkCode(value: string): boolean {
  return normalizeFamilyLinkCode(value).length === FAMILY_LINK_CODE_LENGTH
}

export function formatFamilyLinkCode(value: string): string {
  return normalizeFamilyLinkCode(value)
    .slice(0, FAMILY_LINK_CODE_LENGTH)
    .replace(/(.{4})(?=.)/g, '$1-')
}
