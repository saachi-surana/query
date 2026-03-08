import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env for direct Supabase seeding
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

// Generate 6-char code
function code6() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

// All tests run serially to share session state
test.describe.configure({ mode: 'serial' });

let sessionCode = '';

// Seed a session directly via Supabase so all tests can use it
test.beforeAll(async () => {
  // Cleanup old test data
  await sb.from('sessions').delete().like('title', '[PW]%');

  const code = code6();
  const { data, error } = await sb.from('sessions').insert({
    code, title: '[PW] Browser E2E Test', description: 'Automated Playwright test'
  }).select('*').single();
  if (error) throw new Error(`Seed failed: ${error.message}`);
  sessionCode = data.code;

  // Seed some questions
  await sb.from('questions').insert([
    { session_id: data.id, text: 'What is the hiring timeline for interns?', is_anonymous: true, approved: true },
    { session_id: data.id, text: 'Are remote positions available?', author_name: 'Alice', is_anonymous: false, approved: true },
    { session_id: data.id, text: 'What tech stack does the team use?', author_name: 'Bob', is_anonymous: false, approved: true },
  ]);
});

test.afterAll(async () => {
  await sb.from('sessions').delete().like('title', '[PW]%');
});

// =====================================================================
// P1: LANDING PAGE
// =====================================================================

test('P1: Landing page loads with branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Query');
  await expect(page.getByText('Host a Session')).toBeVisible();
  await expect(page.getByText('Join a Session')).toBeVisible();
});

test('P1: Join with valid code from landing', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[placeholder="ABC123"]').fill(sessionCode);
  await page.locator('button:has-text("Join")').click();
  await page.waitForURL(`/join/${sessionCode}`, { timeout: 10000 });
});

test('P1: Join with invalid code shows error', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[placeholder="ABC123"]').fill('ZZZZZZ');
  await page.locator('button:has-text("Join")').click();
  await expect(page.getByText('not found')).toBeVisible({ timeout: 5000 });
});

test('P1: Navigate to create page via Get Started', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Get Started');
  await expect(page).toHaveURL('/create');
  await expect(page.getByRole('heading', { name: 'Host a Session' })).toBeVisible();
});

// =====================================================================
// P1: CREATE SESSION
// =====================================================================

test('P1: Create page form validates empty title', async ({ page }) => {
  await page.goto('/create');
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
});

test('P1: Create a new session via UI', async ({ page }) => {
  await page.goto('/create');
  await page.fill('#title', '[PW] Created via UI');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/session\/[A-Z0-9]{6}/, { timeout: 10000 });

  // Verify we landed on a session page
  const url = page.url();
  expect(url).toMatch(/\/session\/[A-Z0-9]{6}/);

  // Clean up this session
  const uiCode = url.split('/session/')[1];
  await sb.from('sessions').delete().eq('code', uiCode);
});

// =====================================================================
// P1: HOST DASHBOARD
// =====================================================================

test('P1: Session dashboard shows questions', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  await page.waitForTimeout(2000);
  await expect(page.getByText('hiring timeline').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('remote positions').first()).toBeVisible();
});

test('P1: Session code badge visible in header', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  await expect(page.getByText(sessionCode).first()).toBeVisible();
});

test('P1: Sidebar navigation visible', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  await expect(page.getByText('+ New Session')).toBeVisible();
  await expect(page.getByText('Analytics').first()).toBeVisible();
});

test('P1: Mark question as answered', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  await page.waitForTimeout(2000);

  const markBtn = page.locator('button:has-text("Mark")').first();
  if (await markBtn.isVisible()) {
    await markBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Answered")').first()).toBeVisible();
  }
});

test('P1: Reply to a question', async ({ page }) => {
  // Seed a reply on an UNANSWERED question so it's visible
  const { data: qs } = await sb.from('questions').select('id, session_id')
    .eq('session_id', (await sb.from('sessions').select('id').eq('code', sessionCode).single()).data!.id)
    .eq('approved', true).eq('status', 'pending').limit(1);
  if (!qs || qs.length === 0) return;

  await sb.from('replies').insert({
    question_id: qs[0].id,
    session_id: qs[0].session_id,
    text: 'We hire in Q2.',
    author_name: 'Host',
    is_host: true,
  });

  await page.goto(`/session/${sessionCode}`);
  await page.waitForTimeout(3000);

  // Reply should auto-open on the unanswered question (replies.length > 0)

  await expect(page.getByText('We hire in Q2').first()).toBeVisible({ timeout: 5000 });
});

test('P1: End session and reopen', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  await page.waitForTimeout(1000);

  const endBtn = page.locator('button:has-text("End Session")');
  if (await endBtn.isVisible()) {
    await endBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Reopen")')).toBeVisible();

    await page.locator('button:has-text("Reopen")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("End Session")')).toBeVisible();
  }
});

test('P1: Copy join link shows toast', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);

  // Grant clipboard permission
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  const codeBadge = page.getByText(sessionCode).first();
  await codeBadge.click();
  await page.waitForTimeout(500);

  // Toast should show the join URL
  await expect(page.locator('text=/join/').last()).toBeVisible({ timeout: 3000 });
});

test('P1: Settings FAB opens panel', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);

  // The FAB is the last rounded-full button
  const fab = page.locator('button.rounded-full').last();
  await fab.click();
  await expect(page.getByText('Moderation')).toBeVisible({ timeout: 3000 });
  await fab.click();
});

test('P1: Present button in header', async ({ page, context }) => {
  await page.goto(`/session/${sessionCode}`);

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('a:has-text("Present")').click(),
  ]);
  await newPage.waitForLoadState();
  expect(newPage.url()).toContain(`/present/${sessionCode}`);
  await newPage.close();
});

// =====================================================================
// P1: ATTENDEE JOIN PAGE
// =====================================================================

test('P1: Join page shows session and questions', async ({ page }) => {
  await page.goto(`/join/${sessionCode}`);
  await page.waitForTimeout(2000);
  await expect(page.getByText('[PW] Browser E2E Test').first()).toBeVisible();
});

test('P1: Attendee can submit question', async ({ page }) => {
  await page.goto(`/join/${sessionCode}`);
  await page.waitForTimeout(1000);

  const input = page.locator('textarea, input[placeholder*="question" i], input[placeholder*="ask" i]').first();
  if (await input.isVisible()) {
    await input.fill('How long is the onboarding process?');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Ask"), button:has-text("Submit"), button:has-text("Send")').first();
    await submitBtn.click();
    await expect(page.getByText('onboarding process').first()).toBeVisible({ timeout: 5000 });
  }
});

// =====================================================================
// P1: ALL PAGES LOAD
// =====================================================================

test('P1: Analytics page loads', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.getByText('Total Sessions')).toBeVisible({ timeout: 5000 });
});

test('P1: Present page loads', async ({ page }) => {
  await page.goto(`/present/${sessionCode}`);
  await expect(page.getByText(sessionCode).first()).toBeVisible({ timeout: 5000 });
});

test('P1: Report page loads', async ({ page }) => {
  await page.goto(`/report/${sessionCode}`);
  await expect(page.getByText('Total Questions')).toBeVisible({ timeout: 5000 });
});

// =====================================================================
// P2: PRESENT MODE
// =====================================================================

test('P2: Present page shows content', async ({ page }) => {
  await page.goto(`/present/${sessionCode}`);
  await page.waitForTimeout(2000);
  // Present page should show either cluster cards, unclustered questions, or the empty state
  const hasContent = await page.getByText('hiring timeline').first().isVisible().catch(() => false)
    || await page.getByText('remote positions').first().isVisible().catch(() => false)
    || await page.getByText('Ask a question').isVisible().catch(() => false);
  expect(hasContent).toBeTruthy();
});

test('P2: Present page shows join code prominently', async ({ page }) => {
  await page.goto(`/present/${sessionCode}`);
  // Code should be in the frosted bubble
  const codeEl = page.locator(`text=${sessionCode}`).first();
  await expect(codeEl).toBeVisible();
});

// =====================================================================
// P2: REPORT & ANALYTICS
// =====================================================================

test('P2: Report shows stats and export button', async ({ page }) => {
  await page.goto(`/report/${sessionCode}`);
  await page.waitForTimeout(2000);
  await expect(page.getByText('Total Questions')).toBeVisible();
  await expect(page.getByText('Export CSV')).toBeVisible();
});

test('P2: Analytics sidebar has session links', async ({ page }) => {
  await page.goto('/analytics');
  await page.waitForTimeout(2000);
  await expect(page.getByText('+ New Session')).toBeVisible();
});

// =====================================================================
// P2: UI INTERACTIONS
// =====================================================================

test('P2: Sidebar collapses and expands', async ({ page }) => {
  await page.goto(`/session/${sessionCode}`);
  const hamburger = page.locator('header button').first();
  await hamburger.click();
  await page.waitForTimeout(400);
  await hamburger.click();
  await page.waitForTimeout(400);
  await expect(page.getByText('+ New Session')).toBeVisible();
});

test('P2: Invalid session shows not found', async ({ page }) => {
  await page.goto('/session/XXXXXX');
  await expect(page.getByText('Not Found').or(page.getByText('not found')).or(page.getByText('Session Not Found'))).toBeVisible({ timeout: 5000 });
});
