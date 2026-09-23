import { describe, expect, it } from 'vitest'
import { SCHOOL_RESOURCE_CHECKS, TEN_THINGS_TOPICS } from './resources'

describe('10 Things resources', () => {
  it('keeps the school guide complete and uniquely numbered', () => {
    expect(SCHOOL_RESOURCE_CHECKS).toHaveLength(10)
    expect(new Set(SCHOOL_RESOURCE_CHECKS.map((item) => item.title)).size).toBe(10)
  })

  it('exposes one current guide and clearly marks future topics', () => {
    expect(TEN_THINGS_TOPICS[0]).toMatchObject({
      title: '10 Things to Check at Your School',
      status: 'open',
    })
    expect(TEN_THINGS_TOPICS.slice(1).every((topic) => topic.status === 'coming_soon')).toBe(true)
  })
})
