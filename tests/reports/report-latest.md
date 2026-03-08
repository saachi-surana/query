# Query Test Report — 2026-03-08

## Commit: 8b6a249

## API Test Suite (e2e-test-suite.mjs)

| Metric   | Count |
|----------|-------|
| Total    | 52    |
| Passed   | 52    |
| Failed   | 0     |
| P1 Tests | 31/31 |
| P2 Tests | 21/21 |
| Duration | 7358ms |

**Result: ALL PASS** — All 52 API tests passed with zero failures.

Covers: sessions CRUD, questions, upvotes, replies, moderation, clusters, FAQ, recurring sessions, edge cases (max length, special chars, empty text, duplicates), concurrency (parallel submissions, concurrent upvotes), analytics queries, and auto-suggest toggle.

---

## Browser Tests (Playwright full-flow + mobile-audit)

**Full run (all specs combined):**

| Metric      | Count |
|-------------|-------|
| Total       | 36    |
| Passed      | 7     |
| Failed      | 2     |
| Did not run | 27    |

Note: Playwright uses serial mode in the full-flow spec, so when test #7 fails, all subsequent tests in that spec are skipped.

### Failure 1: `P1: Navigate to create page via Get Started`
- **File:** `tests/browser/full-flow.spec.ts:85`
- **Issue:** Clicking "Get Started" on the landing page now redirects to `/login` instead of `/create`. This is **expected behavior** after the auth middleware was added — unauthenticated users are correctly redirected to login. The test expectation needs updating to reflect the new auth flow.
- **Fix needed:** Update test to expect `/login` redirect, or authenticate before navigating.

### Failure 2: `Mobile: Session with sidebar closed`
- **File:** `tests/browser/mobile-audit.spec.ts:108`
- **Issue:** Timeout waiting for `header button` locator. The hamburger button selector `page.locator('header button').first()` could not find a matching element on the session dashboard page at mobile viewport. The session page may have been redesigned or the sidebar toggle button is rendered differently.
- **Fix needed:** Investigate the session dashboard header at mobile viewport (390x844) and update the hamburger button selector.

---

## Mobile Audit Tests (mobile-audit.spec.ts only)

| Metric      | Count |
|-------------|-------|
| Total       | 10    |
| Passed      | 4     |
| Failed      | 1     |
| Did not run | 5     |

- Landing page: PASS
- Create page: PASS
- Join page: PASS
- Session dashboard: PASS
- Session with sidebar closed: **FAIL** (timeout on hamburger button)
- Header buttons overflow check: SKIPPED (serial dependency)
- Present page: SKIPPED
- Analytics page: SKIPPED
- Report page: SKIPPED
- Touch targets check: SKIPPED

---

## Auth Flow Tests

Auth flow test file was created at `tests/browser/auth-flow-check.spec.ts` but could not be executed due to a tool permission restriction during this session. The tests cover:

1. `/login` loads with "Sign In" text
2. `/signup` loads with "Create Account" or "Sign Up" text
3. `/create` redirects to `/login` (protected)
4. `/session/XXXXXX` redirects to `/login` (protected)
5. `/analytics` redirects to `/login` (protected)
6. `/join/XXXXXX` does NOT redirect (public)
7. `/present/XXXXXX` does NOT redirect (public)
8. `/` does NOT redirect (public)

**Indirect evidence from browser tests:** The "Get Started" button failure confirms that `/create` does redirect to `/login` for unauthenticated users, which validates that the auth middleware is working correctly.

**Status: CREATED, NEEDS MANUAL RUN** — Run `npx playwright test tests/browser/auth-flow-check.spec.ts --reporter=list` to execute.

---

## Areas Needing Attention

### Must Fix
1. **Update full-flow test for auth redirect** — `full-flow.spec.ts:85` expects `/create` after "Get Started" click but now gets `/login`. This blocks 20+ downstream tests in the serial suite. Either update the test to expect `/login` or add authentication to the test setup.

2. **Fix mobile sidebar hamburger selector** — `mobile-audit.spec.ts:108` cannot find the hamburger button on the session dashboard. Inspect the actual header markup at mobile viewport and update the selector. This blocks 5 downstream mobile tests.

### Should Fix
3. **Run auth flow tests** — Execute the new `auth-flow-check.spec.ts` to validate all 8 auth routing scenarios.

4. **Add authenticated browser test flow** — Now that auth middleware is in place, the full-flow browser tests need a login step before accessing protected routes (`/create`, `/session/*`, `/analytics`).

### Tracking
5. **Real-time subscriptions** — Still not covered by any test suite.
6. **API endpoint tests** — `/api/cluster` and `/api/suggest-answer` still not exercised in automated tests.

---

## Test Tracker Updated
- Previous commit: `927131f`
- Current commit: `8b6a249`
- Test version: 2
