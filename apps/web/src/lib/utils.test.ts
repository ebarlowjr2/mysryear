import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins class names and ignores falsy values', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })
})
