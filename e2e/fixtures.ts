import { test as base, expect, type Page } from '@playwright/test'

// Session cookie / storage state — set SESSION_STORAGE_STATE env var to a
// path produced by `playwright auth` or leave unset for anonymous testing.
export const hasSession = !!process.env.SESSION_STORAGE_STATE

export const test = base.extend<{ app: Page }>({
  app: async ({ browser }, use) => {
    const contextOptions = hasSession
      ? { storageState: process.env.SESSION_STORAGE_STATE }
      : {}
    const context = await browser.newContext(contextOptions)
    const page = await context.newPage()
    const baseUrl = process.env.APP_URL ?? 'http://localhost:5173'
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await use(page)
    await context.close()
  },
})

export { expect }
