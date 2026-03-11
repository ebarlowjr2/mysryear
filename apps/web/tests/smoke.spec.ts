import { test, expect } from '@playwright/test'

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /welcome to my senior year/i })).toBeVisible()
  await expect(page.getByLabel(/email address/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
})
