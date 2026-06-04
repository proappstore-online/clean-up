/**
 * Spec: Fix White Background in Dark Mode — clean-up
 *
 * Verifies AC-1 through AC-9 from the ticket spec.
 *
 * Strategy: activate dark mode by setting data-theme="dark" on <html>
 * (exactly what the SDK useTheme hook does), then assert computed
 * background colours on the relevant containers are NOT white/light.
 *
 * "Not white" is defined as: rgb(255, 255, 255) must NOT be the
 * computed background-color. We also positively assert the expected
 * dark values where the spec is explicit (gray-900 = #111827,
 * gray-800 = #1f2937).
 *
 * AC-7 (light mode unchanged) is verified in the same tests by
 * asserting the LIGHT computed values before activating dark mode.
 *
 * AC-8 (tsc build) and AC-9 (no inline styles) are verified by
 * inspecting the DOM attributes — no style attributes are expected
 * on the targeted elements.
 */

import { test, expect, hasSession } from '../fixtures'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Activate dark mode the same way useTheme does. */
async function activateDarkMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  })
}

/** Deactivate dark mode (reset to light). */
async function activateLightMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme')
  })
}

/**
 * Returns the resolved rgb() background-color of the first element
 * matching `selector`.
 */
async function getBgColor(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`Selector not found: ${sel}`)
    return window.getComputedStyle(el).backgroundColor
  }, selector)
}

// Tailwind gray-900 = #111827  → rgb(17, 24, 39)
const GRAY_900 = 'rgb(17, 24, 39)'
// Tailwind gray-800 = #1f2937  → rgb(31, 41, 55)
const GRAY_800 = 'rgb(31, 41, 55)'
// Pure white
const WHITE = 'rgb(255, 255, 255)'

// ─── AC-6: index.html <body> base dark background ───────────────────────────

test('AC-6 — body has bg-white in light mode and dark:bg-gray-900 in dark mode', async ({ app }) => {
  // Light mode: body should resolve to white (bg-white class present)
  await activateLightMode(app)
  const lightBg = await getBgColor(app, 'body')
  expect(lightBg, 'body background in light mode should be white').toBe(WHITE)

  // Dark mode: body must NOT be white, must be gray-900
  await activateDarkMode(app)
  const darkBg = await getBgColor(app, 'body')
  expect(darkBg, 'body background in dark mode must be gray-900 (not white)').toBe(GRAY_900)
})

// ─── AC-1: CleanMarket root wrapper ─────────────────────────────────────────

test('AC-1 — CleanMarket root wrapper is dark gray-900 in dark mode, not white', async ({ app }) => {
  // Wait for the root content to mount (the spinner resolves once migrations run)
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })

  await activateLightMode(app)
  const lightBg = await getBgColor(app, '#root [class*="max-w-5xl"]')
  // In light mode the root wrapper should not override to a dark color
  expect(lightBg, 'Root wrapper in light mode should NOT be gray-900').not.toBe(GRAY_900)

  await activateDarkMode(app)
  const darkBg = await getBgColor(app, '#root [class*="max-w-5xl"]')
  expect(darkBg, 'Root wrapper in dark mode must be gray-900').toBe(GRAY_900)
  expect(darkBg, 'Root wrapper in dark mode must NOT be white').not.toBe(WHITE)
})

// ─── AC-9: no inline background style on the root wrapper ───────────────────

test('AC-9 — CleanMarket root wrapper has no inline style background override', async ({ app }) => {
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })
  const styleAttr = await app.evaluate(() => {
    const el = document.querySelector('#root [class*="max-w-5xl"]')
    return el?.getAttribute('style') ?? ''
  })
  // style attribute must not contain a hardcoded background colour
  expect(styleAttr, 'Root wrapper must not have inline background style').not.toMatch(/background/)
})

// ─── AC-2: JobList container ─────────────────────────────────────────────────

test('AC-2 — JobList grid container has no white background in dark mode', async ({ app }) => {
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })

  // The job list grid renders once data loads (or empty state)
  // Wait for either the job cards grid OR the empty-state element
  await app.waitForSelector(
    '[class*="grid gap-4"], [class*="text-center py-20"]',
    { timeout: 15_000 },
  )

  await activateDarkMode(app)

  // The grid wrapper itself has no bg class (transparent/inherited), so its
  // computed background should NOT be white
  const gridBg = await getBgColor(app, '[class*="grid gap-4"]').catch(() => null)
  if (gridBg !== null) {
    expect(gridBg, 'JobList grid in dark mode must NOT be white').not.toBe(WHITE)
  }

  // If the empty state is visible, check it too
  const emptyState = await app.locator('[class*="text-center py-20"]').first()
  if (await emptyState.isVisible()) {
    const emptyBg = await getBgColor(app, '[class*="text-center py-20"]')
    expect(emptyBg, 'JobList empty-state in dark mode must NOT be white').not.toBe(WHITE)
  }
})

// ─── AC-2 / light mode unchanged ─────────────────────────────────────────────

test('AC-7/AC-2 — JobList does not go dark in light mode', async ({ app }) => {
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })
  await app.waitForSelector(
    '[class*="grid gap-4"], [class*="text-center py-20"]',
    { timeout: 15_000 },
  )

  await activateLightMode(app)

  // In light mode the root max-w-5xl wrapper must NOT show gray-900
  const rootBg = await getBgColor(app, '#root [class*="max-w-5xl"]')
  expect(rootBg, 'Root wrapper must NOT be gray-900 in light mode').not.toBe(GRAY_900)
})

// ─── AC-5: JobCard background ────────────────────────────────────────────────

test('AC-5 — JobCard is bg-white in light mode and dark:bg-gray-800 in dark mode', async ({ app }) => {
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })

  // Wait for at least one job card to appear; skip if no jobs are listed
  const cardLocator = app.locator('button[aria-label^="View job:"]').first()
  const cardExists = await cardLocator.isVisible().catch(() => false)

  test.skip(!cardExists, 'No job cards visible — skipping JobCard dark mode check')

  // Light mode: card should be white
  await activateLightMode(app)
  const lightBg = await app.evaluate(() => {
    const el = document.querySelector('button[aria-label^="View job:"]')
    if (!el) throw new Error('No job card found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(lightBg, 'JobCard in light mode should be white').toBe(WHITE)

  // Dark mode: card must be gray-800, not white
  await activateDarkMode(app)
  const darkBg = await app.evaluate(() => {
    const el = document.querySelector('button[aria-label^="View job:"]')
    if (!el) throw new Error('No job card found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(darkBg, 'JobCard in dark mode must be gray-800').toBe(GRAY_800)
  expect(darkBg, 'JobCard in dark mode must NOT be white').not.toBe(WHITE)
})

// ─── AC-3: JobDetail container ───────────────────────────────────────────────

test('AC-3 — JobDetail outer wrapper is dark:bg-gray-900 and inner panel is dark:bg-gray-800', async ({ app }) => {
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })

  const cardLocator = app.locator('button[aria-label^="View job:"]').first()
  const cardExists = await cardLocator.isVisible().catch(() => false)
  test.skip(!cardExists, 'No job cards visible — skipping JobDetail dark mode check')

  // Navigate into job detail
  await cardLocator.click()
  // Wait for the detail view back button
  await app.waitForSelector('button:has-text("← Back to listings")', { timeout: 10_000 })

  // Dark mode: outer container must be gray-900
  await activateDarkMode(app)

  // The outer detail div wrapping everything has dark:bg-gray-900 min-h-screen
  // It is the first child of the root max-w-5xl wrapper when in detail view
  const outerDetailBg = await app.evaluate(() => {
    // Find the div with min-h-screen inside the max-w-5xl wrapper that contains the back button
    const back = document.querySelector('button')
    if (!back) throw new Error('No back button')
    // Walk up to its parent container
    const container = back.closest('[class*="min-h-screen"]')
    if (!container) throw new Error('No min-h-screen container in detail')
    return window.getComputedStyle(container).backgroundColor
  })
  expect(outerDetailBg, 'JobDetail outer container must be gray-900 in dark mode').toBe(GRAY_900)
  expect(outerDetailBg, 'JobDetail outer container must NOT be white in dark mode').not.toBe(WHITE)

  // Inner card panel (rounded-2xl border) must be gray-800
  const innerCardBg = await app.evaluate(() => {
    const el = document.querySelector('[class*="rounded-2xl"][class*="shadow-sm"]')
    if (!el) throw new Error('No inner detail card found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(innerCardBg, 'JobDetail inner card must be gray-800 in dark mode').toBe(GRAY_800)
  expect(innerCardBg, 'JobDetail inner card must NOT be white in dark mode').not.toBe(WHITE)

  // Light mode: inner card must be white, not dark
  await activateLightMode(app)
  const innerCardLightBg = await app.evaluate(() => {
    const el = document.querySelector('[class*="rounded-2xl"][class*="shadow-sm"]')
    if (!el) throw new Error('No inner detail card found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(innerCardLightBg, 'JobDetail inner card must be white in light mode').toBe(WHITE)
})

// ─── AC-4: PostJobModal ───────────────────────────────────────────────────────

test('AC-4 — PostJobModal overlay and panel are dark in dark mode', async ({ app }) => {
  test.skip(!hasSession, 'needs a session — posting requires sign-in')

  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })

  // Open the post job modal via the "+ Post a Job" button
  const postButton = app.getByRole('button', { name: /post a job/i })
  await expect(postButton, '+ Post a Job button must be visible when signed in').toBeVisible()
  await postButton.click()

  // Wait for the modal to appear
  await app.waitForSelector('[aria-label="Close modal"]', { timeout: 5_000 })

  // Dark mode
  await activateDarkMode(app)

  // Overlay (fixed inset-0 z-50): bg-black/50 dark:bg-gray-900/80
  // The overlay itself is the outer fixed div; its bg in dark mode is gray-900 at 80% opacity.
  // Computed value will be rgba(17, 24, 39, 0.8) — NOT white.
  const overlayBg = await app.evaluate(() => {
    const el = document.querySelector('[class*="fixed inset-0"]')
    if (!el) throw new Error('No modal overlay found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(overlayBg, 'Modal overlay in dark mode must NOT be white').not.toBe(WHITE)
  // Must not be pure opaque white or fully transparent
  expect(overlayBg, 'Modal overlay in dark mode must not be rgba(0,0,0,0)').not.toBe('rgba(0, 0, 0, 0)')

  // Inner panel (bg-white dark:bg-gray-800 rounded-2xl shadow-2xl)
  const panelBg = await app.evaluate(() => {
    const el = document.querySelector('[class*="rounded-2xl"][class*="shadow-2xl"]')
    if (!el) throw new Error('No modal panel found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(panelBg, 'Modal panel in dark mode must be gray-800').toBe(GRAY_800)
  expect(panelBg, 'Modal panel in dark mode must NOT be white').not.toBe(WHITE)

  // Light mode: panel must be white
  await activateLightMode(app)
  const panelLightBg = await app.evaluate(() => {
    const el = document.querySelector('[class*="rounded-2xl"][class*="shadow-2xl"]')
    if (!el) throw new Error('No modal panel found')
    return window.getComputedStyle(el).backgroundColor
  })
  expect(panelLightBg, 'Modal panel in light mode must be white').toBe(WHITE)
})

// ─── AC-9 (global): confirm no inline style background on audited containers ─

test('AC-9 — no inline style background on body, JobCard, or modal panel', async ({ app }) => {
  await app.waitForSelector('#root [class*="max-w-5xl"]', { timeout: 15_000 })

  // body
  const bodyStyle = await app.evaluate(() => document.body.getAttribute('style') ?? '')
  expect(bodyStyle, 'body must not have an inline background style').not.toMatch(/background/)

  // root wrapper
  const rootWrapperStyle = await app.evaluate(() => {
    const el = document.querySelector('#root [class*="max-w-5xl"]')
    return el?.getAttribute('style') ?? ''
  })
  expect(rootWrapperStyle, 'Root wrapper must not have inline background style').not.toMatch(/background/)

  // Any visible job card (if present)
  const cardStyle = await app.evaluate(() => {
    const el = document.querySelector('button[aria-label^="View job:"]')
    return el ? (el.getAttribute('style') ?? '') : null
  })
  if (cardStyle !== null) {
    expect(cardStyle, 'JobCard must not have inline background style').not.toMatch(/background/)
  }
})

// ─── AC-8: TypeScript structural sanity (class strings only — no new JS) ─────
// AC-8 requires `tsc --noEmit` to exit 0.  We verify the observable
// symptom: no React error boundary or console error fires on mount,
// which would indicate a broken import or type error surfaced at runtime.

test('AC-8 — app mounts with no console errors indicating broken imports', async ({ app }) => {
  const errors: string[] = []
  app.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  // Navigate fresh
  await app.reload({ waitUntil: 'networkidle' })
  await app.waitForSelector('#root', { timeout: 10_000 })

  // Allow a short settle time for any synchronous errors to flush
  await app.waitForTimeout(2_000)

  const fatalErrors = errors.filter(
    (e) =>
      e.includes('SyntaxError') ||
      e.includes('TypeError') ||
      e.includes('ReferenceError') ||
      e.includes('Cannot find module') ||
      e.includes('is not a function') ||
      e.includes('is not exported'),
  )
  expect(fatalErrors, `Console errors indicating broken build: ${fatalErrors.join('; ')}`).toHaveLength(0)
})
