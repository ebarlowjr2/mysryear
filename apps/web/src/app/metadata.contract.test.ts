import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8')
const logo = readFileSync(join(process.cwd(), 'src/components/Logo.tsx'), 'utf8')

describe('site metadata and brand assets', () => {
  it('uses MySRYear production branding and social preview assets', () => {
    expect(layout).toContain("metadataBase: new URL('https://www.mysryear.net')")
    expect(layout).toContain("applicationName: 'MySRYear'")
    expect(layout).toContain("siteName: 'MySRYear'")
    expect(layout).toContain("url: 'https://www.mysryear.net'")
    expect(layout).toContain("url: '/brand/mysryear-social-preview.png'")
    expect(layout).toContain('width: 1200')
    expect(layout).toContain('height: 630')
    expect(layout).toContain("card: 'summary_large_image'")
    expect(layout).toContain("images: ['/brand/mysryear-social-preview.png']")
    expect(layout).toContain("{ url: '/favicon.ico', sizes: 'any' }")
    expect(layout).toContain("{ url: '/icon.png', type: 'image/png', sizes: '512x512' }")
    expect(layout).toContain("{ url: '/apple-icon.png', type: 'image/png', sizes: '180x180' }")
  })

  it('renders the navbar logo from the canonical brand asset', () => {
    expect(logo).toContain('next/image')
    expect(logo).toContain('src="/brand/mysryear-logo-header.png"')
    expect(logo).toContain('alt="MySRYear"')
  })
})
