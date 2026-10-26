# CleanMarket

Cleaning job marketplace hosted at https://clean-up.proappstore.online/.

Run `pnpm test` for unit/integration tests and `pnpm build` for the TypeScript
check and production bundle in `web/dist`.

Push to `main` deploys through `.github/workflows/deploy.yml`. The workflow runs
tests and the build before uploading to R2, then runs Playwright against production.
`/build.json` identifies the deployed commit; the release smoke test compares it
with the workflow SHA and checks that the JavaScript and CSS assets are served.

To run the browser suite locally:

```sh
npm install --prefix e2e
cd e2e
npx playwright install chromium
E2E_BASE_URL=https://clean-up.proappstore.online EXPECTED_COMMIT_SHA=<deployed-sha> npm test
```

Public smoke tests run without credentials. Tests for signed-in screens skip
unless `SESSION_STORAGE_STATE` points to a Playwright storage-state file from a
real signed-in session for the target origin. An invalid supplied session fails
the tests. Keep session files outside the repository and never commit them.
