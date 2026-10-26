import { test, expect, hasSession } from '../fixtures'

test('production serves the expected release and its JavaScript and CSS', async ({ app }) => {
  const metadata = await app.request.get('/build.json', {
    headers: { 'Cache-Control': 'no-cache' },
  })
  expect(metadata.status()).toBe(200)
  const build = await metadata.json()
  expect(build.commit).toBe(process.env.EXPECTED_COMMIT_SHA ?? 'development')

  const assets = await app.locator('script[type="module"][src], link[rel="stylesheet"][href]')
    .evaluateAll(elements => elements.map(element => element.getAttribute('src') ?? element.getAttribute('href')!))
  expect(assets.length).toBeGreaterThanOrEqual(2)
  for (const asset of assets) {
    const response = await app.request.get(asset)
    expect(response.status(), asset).toBe(200)
    expect(response.headers()['content-type'], asset).toMatch(/javascript|text\/css/)
  }
})

test('anonymous visitors see the working sign-in gate', async ({ app }) => {
  test.skip(hasSession, 'Anonymous session required')
  await expect(app.getByRole('heading', { name: 'CleanMarket', exact: true })).toBeVisible()
  await expect(app.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible()
})
