# E2E tests (Playwright)

## Run the tenant E2E test

1. **Start the API** (required for login):
   ```bash
   pnpm dev:api
   ```

2. **Seed the database** once (creates `admin@demoschool.local` / `School@1234`):
   ```bash
   pnpm db:seed
   ```

3. From the repo root:
   ```bash
   pnpm test:e2e
   ```
   or with UI: `pnpm test:e2e:ui`

Playwright **starts the web app** on port 3002 automatically (`pnpm dev:web:alt`), so you don’t need to run it yourself. If port 3002 is already in use, that server is reused. The API must be running and seeded; the test fails in `beforeAll` with a clear message if the API is down or credentials are invalid.
