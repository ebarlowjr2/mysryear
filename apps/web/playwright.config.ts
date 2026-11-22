import { defineConfig } from '@playwright/test'

const port = 3000
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Optional: reuse a preinstalled Chromium (e.g. sandboxed CI images).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  // When PLAYWRIGHT_BASE_URL points at an already-running server, don't start
  // (and overwrite .next with) a dev server.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        port,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_SUPABASE_URL:
            process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-anon-key',
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${port}`,
        },
      },
})
