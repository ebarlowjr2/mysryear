/**
 * Targeted Scholarship Discovery end-to-end scenario.
 *
 * Runs only against a LOCAL/STAGING Supabase that has the catalog imported
 * (see docs/scholarship-discovery.md → "Local proof"). Skipped otherwise so the
 * default smoke run stays independent of a database.
 *
 *   SCHOLARSHIP_E2E=1 E2E_JWT_SECRET=... NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
 *     npx playwright test tests/scholarships.spec.ts
 *
 * Test students (seeded locally): Jordan (grade 12, Software Engineer + Digital
 * Marketer, two older tracked awards), Avery (grade 12, Welder + Electrician,
 * Alabama), Sam (grade 10, no career plans, no GPA).
 */
import { createHmac } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const enabled = process.env.SCHOLARSHIP_E2E === '1'
const SHOTS = process.env.SCHOLARSHIP_SCREENSHOT_DIR

const STUDENTS = {
  jordan: { id: '11111111-1111-4111-8111-111111111111', email: 'senior.swe@local.test' },
  avery: { id: '22222222-2222-4222-8222-222222222222', email: 'senior.trades@local.test' },
  sam: { id: '33333333-3333-4333-8333-333333333333', email: 'sparse.sophomore@local.test' },
}

function b64url(value: string) {
  return Buffer.from(value).toString('base64url')
}

async function signIn(page: Page, who: keyof typeof STUDENTS) {
  const secret = process.env.E2E_JWT_SECRET!
  const user = STUDENTS[who]
  const exp = Math.floor(Date.now() / 1000) + 3600
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp }))
  const token = `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`
  const session = {
    access_token: token,
    refresh_token: 'local-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
  }
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321').hostname.split('.')[0]
  await page.context().clearCookies()
  await page.context().addCookies([
    { name: `sb-${host}-auth-token`, value: `base64-${b64url(JSON.stringify(session))}`, domain: 'localhost', path: '/' },
  ])
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

test.describe('Scholarship Discovery', () => {
  test.skip(!enabled, 'Set SCHOLARSHIP_E2E=1 against a local/staging catalog')

  test('sparse 10th grader browses real open awards, searches, and is offered the LifePath picker', async ({ page }) => {
    await signIn(page, 'sam')
    await page.goto('/scholarships')
    const open = page.getByTestId('open-scholarships')
    await expect(open.getByRole('heading', { name: 'BURGER KING Scholars Program' })).toBeVisible()
    await expect(open.locator('article')).toHaveCount(8)
    await expect(page.getByText('6 open now · 2 opening soon')).toBeVisible()
    await expect(open.getByText('Closes Dec 15, 2026, 11:59 PM CT')).toBeVisible()
    await expect(open.getByText(/first 30,000 community/)).toBeVisible()
    await expect(open.getByText('Opens Dec 1, 2026 · closes Mar 1, 2027')).toBeVisible()
    const forYou = page.getByTestId('for-you')
    await expect(forYou.getByRole('link', { name: 'Choose career interests' })).toHaveAttribute('href', '/aura/lifepath/select')
    await expect(page.getByRole('link', { name: 'Add your GPA →' })).toBeVisible()
    await shot(page, 'web-desktop-sparse-student')

    await page.getByLabel('Search').fill('poetry')
    await expect(open.locator('article')).toHaveCount(1)
    await expect(open.getByRole('heading', { name: 'Penguin Random House Creative Writing Awards' })).toBeVisible()
    await page.getByLabel('Search').fill('no-such-award-xyz')
    await expect(page.getByTestId('catalog-no-results')).toBeVisible()
  })

  test('two career plans produce different explained matches; tracker keeps closed awards', async ({ page }) => {
    await signIn(page, 'jordan')
    await page.goto('/scholarships')
    const forYou = page.getByTestId('for-you')
    await expect(forYou.getByRole('link', { name: 'Amazon Future Engineer Scholarship' })).toBeVisible()
    await expect(forYou.getByText(/Your #1 career plan, Software Engineer: the sponsor lists Computer Science/)).toBeVisible()
    await expect(forYou.getByText(/A career match is not eligibility/)).toBeVisible()
    const tracker = page.getByTestId('tracker')
    await expect(tracker.getByText('Coca-Cola Scholars Program')).toBeVisible()
    await expect(tracker.getByText(/Closed Oct 31, 2024/)).toBeVisible()
    await tracker.getByRole('tab', { name: /Submitted/ }).click()
    await expect(tracker.getByText('Jack Kent Cooke Foundation Scholarship')).toBeVisible()
    await shot(page, 'web-desktop-jordan-swe')

    await signIn(page, 'avery')
    await page.goto('/scholarships')
    const avery = page.getByTestId('for-you')
    await expect(avery.getByRole('link', { name: 'Central AlabamaWorks Scholarship' })).toBeVisible()
    await expect(avery.getByRole('link', { name: 'Amazon Future Engineer Scholarship' })).toHaveCount(0)
    await shot(page, 'web-desktop-avery-trades')
  })

  test('saving an award persists and opens the detail page with the official Apply link', async ({ page }) => {
    await signIn(page, 'avery')
    await page.goto('/scholarships')
    const card = page.locator('article', { has: page.getByRole('heading', { name: 'GE-Reagan Foundation Scholarship Program' }) })
    await card.getByRole('button', { name: /Save GE-Reagan/ }).click()
    await expect(card.getByText('Saved', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.locator('article', { has: page.getByRole('heading', { name: 'GE-Reagan Foundation Scholarship Program' }) }).getByText('Saved', { exact: true })).toBeVisible()
    await card.getByRole('link', { name: 'Details' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'GE-Reagan Foundation Scholarship Program' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Apply on official site ↗' })).toHaveAttribute('href', 'https://apply.mykaleidoscope.com/program/GEReagan2027Scholarship')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  })

  test('phone-width layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page, 'jordan')
    await page.goto('/scholarships')
    await expect(page.getByRole('heading', { name: 'Open scholarships' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await shot(page, 'web-phone-jordan')
  })
})
