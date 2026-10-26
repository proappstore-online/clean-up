import { test as base, expect, type Page } from '@playwright/test'

// Session cookie / storage state — set SESSION_STORAGE_STATE env var to a
// path produced by `playwright auth` or leave unset for anonymous testing.
export const hasSession = !!process.env.SESSION_STORAGE_STATE

export const test = base.extend<{ app: Page }>({
  app: async ({ browser, navigationTimeout }, use) => {
    const baseUrl =
      process.env.E2E_BASE_URL ??
      process.env.APP_URL ??
      'http://localhost:5173'
    const contextOptions = hasSession
      ? { storageState: process.env.SESSION_STORAGE_STATE }
      : {}
    const context = await browser.newContext({ ...contextOptions, baseURL: baseUrl })
    context.setDefaultNavigationTimeout(navigationTimeout)
    const page = await context.newPage()
    // Prefer E2E_BASE_URL (set by CI to the live deployed app), then APP_URL,
    // then fall back to localhost for local development.
    await page.goto(baseUrl, { waitUntil: 'load' })
    await use(page)
    await context.close()
  },
})

export { expect }
