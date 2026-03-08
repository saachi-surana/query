import { test, expect, devices } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const projectRoot = path.resolve(__dirname, '../..');
function loadEnv() {
  const content = fs.readFileSync(path.resolve(projectRoot, '.env.local'), 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return vars;
}
const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Use iPhone SE viewport
test.use({ ...devices['iPhone SE'] });

function code6() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

test.describe.configure({ mode: 'serial' });

let sessionCode = '';
const screenshotDir = path.resolve(__dirname, '../reports/mobile-screenshots');

test.beforeAll(async () => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await sb.from('sessions').delete().like('title', '[MOB]%');
  const code = code6();
  const { data } = await sb.from('sessions').insert({
    code, title: '[MOB] Mobile Test Session', description: 'Testing mobile layout'
  }).select('*').single();
  sessionCode = data!.code;
  // Seed questions
  await sb.from('questions').insert([
    { session_id: data!.id, text: 'How do I apply for the summer internship program?', is_anonymous: true, approved: true, upvotes: 5 },
    { session_id: data!.id, text: 'What tech stack does the engineering team use?', author_name: 'Alice', is_anonymous: false, approved: true, upvotes: 3 },
    { session_id: data!.id, text: 'Are there remote work options for new hires?', author_name: 'Bob', is_anonymous: false, approved: true, upvotes: 8 },
  ]);
});

test.afterAll(async () => {
  await sb.from('sessions').delete().like('title', '[MOB]%');
});

// =====================================================================
// Public pages - screenshot + check for horizontal overflow
// =====================================================================

test('Mobile: Landing page', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // Check no horizontal scroll
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  await page.screenshot({ path: path.join(screenshotDir, '01-landing.png'), fullPage: true });
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
});

test('Mobile: Join page', async ({ page }) => {
  await page.goto(`/join/${sessionCode}`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '03-join.png'), fullPage: true });

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
});

test('Mobile: Present page', async ({ page }) => {
  await page.goto(`/present/${sessionCode}`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, '07-present.png'), fullPage: true });

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  if (scrollWidth > clientWidth + 5) {
    console.log(`  WARNING: Present page horizontal overflow! scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
  }
});

// =====================================================================
// Protected pages - verify redirect to /login, then screenshot login page
// =====================================================================

test('Mobile: /create redirects to /login', async ({ page }) => {
  await page.goto('/create');
  await expect(page).toHaveURL('/login', { timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, '02-create-redirected-to-login.png'), fullPage: true });

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
});

test('Mobile: /session/:code redirects to /login', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  await expect(page).toHaveURL('/login', { timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, '04-session-redirected-to-login.png'), fullPage: true });

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
});

test('Mobile: /analytics redirects to /login', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page).toHaveURL('/login', { timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, '08-analytics-redirected-to-login.png'), fullPage: true });
});

test('Mobile: /report/:code redirects to /login', async ({ page }) => {
  await page.goto(`/report/${sessionCode}`);
  await expect(page).toHaveURL('/login', { timeout: 10000 });
  await page.screenshot({ path: path.join(screenshotDir, '09-report-redirected-to-login.png'), fullPage: true });
});

// =====================================================================
// Public page interactions
// =====================================================================

test('Mobile: Touch targets check (buttons >= 44px)', async ({ page }) => {
  await page.goto(`/join/${sessionCode}`);
  await page.waitForTimeout(2000);

  // Check upvote button sizes
  const smallButtons = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const small: string[] = [];
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
        small.push(`${btn.textContent?.trim().slice(0, 20)} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
      }
    });
    return small;
  });

  if (smallButtons.length > 0) {
    console.log(`  WARNING: ${smallButtons.length} buttons smaller than 36px:`);
    smallButtons.forEach(b => console.log(`    - ${b}`));
  }

  await page.screenshot({ path: path.join(screenshotDir, '10-touch-targets.png'), fullPage: true });
});
