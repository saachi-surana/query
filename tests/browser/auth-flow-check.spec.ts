import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Auth flow verification', () => {
  test('Login page loads with Sign In text', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 10000 });
  });

  test('Signup page loads with Create Account or Sign Up text', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 10000 });
  });

  test('/create redirects to /login (protected route)', async ({ page }) => {
    await page.goto(`${BASE}/create`);
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('/session/XXXXXX redirects to /login (protected route)', async ({ page }) => {
    await page.goto(`${BASE}/session/XXXXXX`);
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('/analytics redirects to /login (protected route)', async ({ page }) => {
    await page.goto(`${BASE}/analytics`);
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('/join/XXXXXX does NOT redirect (public route)', async ({ page }) => {
    await page.goto(`${BASE}/join/XXXXXX`);
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/join/XXXXXX');
  });

  test('/present/XXXXXX does NOT redirect (public route)', async ({ page }) => {
    await page.goto(`${BASE}/present/XXXXXX`);
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/present/XXXXXX');
  });

  test('/ does NOT redirect (public route)', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toBe(`${BASE}/`);
  });
});
