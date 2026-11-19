import { describe, expect, it } from 'vitest'
import {
  FAMILY_LINK_CODE_LENGTH,
  formatFamilyLinkCode,
  isValidFamilyLinkCode,
  normalizeFamilyLinkCode,
} from './family-links'

describe('family link codes', () => {
  it('normalizes a code copied with spaces or hyphens', () => {
    expect(normalizeFamilyLinkCode('a1b2-c3d4 e5f6-g7h8')).toBe('A1B2C3D4E5F6G7H8')
    expect(isValidFamilyLinkCode('a1b2-c3d4 e5f6-g7h8')).toBe(true)
  })

  it('formats the fixed-length code for clear sharing', () => {
    const code = 'A1B2C3D4E5F6G7H8'
    expect(code).toHaveLength(FAMILY_LINK_CODE_LENGTH)
    expect(formatFamilyLinkCode(code)).toBe('A1B2-C3D4-E5F6-G7H8')
  })
})
