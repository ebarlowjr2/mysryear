import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const resourcesPage = readFileSync(join(process.cwd(), 'src/app/resources/page.tsx'), 'utf8')
const guidePage = readFileSync(
  join(process.cwd(), 'src/app/resources/ten-things-school/page.tsx'),
  'utf8',
)

describe('10 Things resource guide', () => {
  it('keeps Resources as a compact entry point to the full guide', () => {
    expect(resourcesPage).toContain('Open full guide')
    expect(resourcesPage).toContain('href="/resources/ten-things-school"')
    expect(resourcesPage).not.toContain('SCHOOL_RESOURCE_CHECKS.map')
  })

  it('renders the dedicated guide with all ten shared resource checks', () => {
    expect(guidePage).toContain("import { SCHOOL_RESOURCE_CHECKS } from '@mysryear/shared'")
    expect(guidePage).toContain('SCHOOL_RESOURCE_CHECKS.map')
    expect(guidePage).toContain(
      '10 things to check at your school before you pay for them elsewhere.',
    )
  })
})
