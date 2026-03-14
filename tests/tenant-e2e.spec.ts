import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@demoschool.local';
const ADMIN_PASSWORD = 'School@1234';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

test.describe('Tenant E2E', () => {
  test.beforeAll('API must be running and credentials valid', async () => {
    const health = await fetch(`${API_URL}/health`).catch(() => null);
    if (!health?.ok) {
      throw new Error(
        `API is not running at ${API_URL}. Start it with: pnpm dev:api`
      );
    }
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    }).catch(() => null);
    if (!loginRes) {
      throw new Error(`Could not reach ${API_URL}/auth/login. Is the API running?`);
    }
    if (loginRes.status === 401) {
      throw new Error(
        `Login credentials rejected by API. Run: pnpm db:seed (creates ${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`
      );
    }
    if (!loginRes.ok) {
      throw new Error(`Auth API returned ${loginRes.status}. Check API logs.`);
    }
  });

  test('school admin: login → competition → category → teams → bracket → match result', async ({
    page,
  }) => {
    // Log in via UI: fill form and click so the real signIn flow sets the session cookie.
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Email')).toBeVisible();
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    const signInClicked = page.getByRole('button', { name: 'Sign in' }).click();
    const authResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/api/auth/') &&
        (res.request().method() === 'POST') &&
        (res.status() === 200 || res.status() === 302),
      { timeout: 15_000 }
    );
    await signInClicked;
    await authResponse;
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText('Athletic Bharat')).toBeVisible();

    await page.getByRole('link', { name: 'Students', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/students/);
    await expect(page.getByText(/Students/i)).toBeVisible();

    await page.getByRole('link', { name: 'Competitions' }).click();
    await expect(page).toHaveURL(/\/app\/competitions/);

    await page.getByRole('link', { name: 'New competition' }).click();
    await expect(page).toHaveURL(/\/app\/competitions\/new/);
    await page.getByLabel('Name').fill('E2E Sports Day');
    await page.getByLabel('Academic year').fill('2025-26');
    await page.getByLabel('Start date').fill('2025-11-01');
    await page.getByLabel('End date').fill('2025-11-15');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/\/app\/competitions$/);

    await page.getByText('E2E Sports Day').locator('..').locator('..').getByRole('link', { name: 'Open' }).click();
    await expect(page).toHaveURL(/\/app\/competitions\/.+/);

    await page.getByRole('link', { name: 'Manage sports & categories' }).click();
    await expect(page).toHaveURL(/\/app\/competitions\/.+\/sports/);

    const footballCard = page.locator('div').filter({ hasText: /Football\s+\(TEAM\)/ }).first();
    await footballCard.getByRole('button', { name: 'Enable' }).click();
    await page.waitForTimeout(800);
    await page.locator('div').filter({ hasText: /Football\s+\(TEAM\)/ }).first().getByRole('link', { name: 'Categories' }).click();
    await expect(page).toHaveURL(/\/app\/competition-sports\/.+\/categories/);

    await page.getByRole('button', { name: 'Add category' }).click();
    await page.getByLabel('Name').fill('Boys U14');
    await page.getByLabel('Gender').selectOption('BOYS');
    await page.getByLabel('Format').selectOption('KNOCKOUT');
    await page.getByRole('button', { name: 'Create' }).click();

    await page.getByText('Boys U14').locator('..').locator('..').getByRole('link', { name: 'Open' }).click();
    await expect(page).toHaveURL(/\/app\/competition-sports\/.+\/categories\/.+/);

    await page.getByRole('button', { name: 'Add multiple teams' }).click();
    await page.locator('textarea').fill('Red House - Coach A\nBlue House - Coach B\nGreen House\nYellow House');
    await page.getByRole('button', { name: 'Create teams' }).click();
    await expect(page.getByText(/4 teams/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Generate knockout bracket' }).click();
    await expect(page.getByText(/Fight table \/ Matches by round/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: /vs/ }).first().click();
    await expect(page).toHaveURL(/\/app\/matches\/.+/);

    await page.getByLabel(/Summary A/i).fill('2');
    await page.getByLabel(/Summary B/i).fill('1');
    await page.getByRole('button', { name: 'Save scorecard' }).click();

    await page.getByRole('button', { name: /wins/ }).first().click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Result/i)).toBeVisible();
    await expect(page.getByText(/Winner/i)).toBeVisible();
  });
});
