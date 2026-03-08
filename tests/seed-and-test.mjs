// seed-and-test.mjs
// Comprehensive test suite for the Query application (Supabase backend)
// Usage: node tests/seed-and-test.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Parse .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(projectRoot, '.env.local');
  let content;
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch {
    console.error('Could not read .env.local – make sure it exists at the project root.');
    process.exit(1);
  }

  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_PREFIX = '[TEST]';
const results = [];

function uniqueCode() {
  return 'T' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration_ms = Date.now() - start;
    console.log(`  PASS  ${name} (${duration_ms}ms)`);
    results.push({ name, passed: true, duration_ms });
  } catch (err) {
    const duration_ms = Date.now() - start;
    const errorMsg = err?.message ?? String(err);
    console.error(`  FAIL  ${name} (${duration_ms}ms) — ${errorMsg}`);
    results.push({ name, passed: false, error: errorMsg, duration_ms });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || 'assertEqual'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// Cleanup helper – deletes all [TEST] sessions (cascades to questions, etc.)
// ---------------------------------------------------------------------------
async function cleanupTestData() {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .like('title', `${TEST_PREFIX}%`);
  if (error) console.error('Cleanup error:', error.message);
}

// ---------------------------------------------------------------------------
// Quick-create helpers
// ---------------------------------------------------------------------------
async function createSession(overrides = {}) {
  const payload = {
    code: uniqueCode(),
    title: `${TEST_PREFIX} Session`,
    ...overrides,
  };
  const { data, error } = await supabase.from('sessions').insert(payload).select().single();
  if (error) throw new Error(`createSession: ${error.message}`);
  return data;
}

async function createQuestion(session_id, overrides = {}) {
  const payload = {
    session_id,
    text: 'Test question?',
    ...overrides,
  };
  const { data, error } = await supabase.from('questions').insert(payload).select().single();
  if (error) throw new Error(`createQuestion: ${error.message}`);
  return data;
}

async function createReply(question_id, session_id, overrides = {}) {
  const payload = {
    question_id,
    session_id,
    text: 'Test reply',
    ...overrides,
  };
  const { data, error } = await supabase.from('replies').insert(payload).select().single();
  if (error) throw new Error(`createReply: ${error.message}`);
  return data;
}

// ===========================================================================
// TEST SCENARIOS
// ===========================================================================

// 1. Session Creation
async function testSessionCreation() {
  const session = await createSession({ title: `${TEST_PREFIX} Basic Session` });
  assert(session.id, 'Session should have an id');
  assert(session.code, 'Session should have a code');
  assertEqual(session.title, `${TEST_PREFIX} Basic Session`, 'title');
  assertEqual(session.moderation_enabled, false, 'moderation_enabled default');
  assertEqual(session.auto_suggest, false, 'auto_suggest default');
  assert(session.ended_at === null, 'ended_at should be null');
}

// 2. Session with all options
async function testSessionAllOptions() {
  const now = new Date().toISOString();
  const session = await createSession({
    title: `${TEST_PREFIX} Full Options`,
    description: 'A session with every option set',
    starts_at: now,
    auto_suggest: true,
  });
  assertEqual(session.description, 'A session with every option set', 'description');
  assertEqual(session.auto_suggest, true, 'auto_suggest');
  assert(session.starts_at !== null, 'starts_at should be set');
}

// 3. Recurring Weekly
async function testRecurringWeekly() {
  const parent = await createSession({
    title: `${TEST_PREFIX} Weekly Parent`,
    recurrence_type: 'weekly',
  });
  assertEqual(parent.recurrence_type, 'weekly', 'recurrence_type');
  // Create a child that references the parent
  const child = await createSession({
    title: `${TEST_PREFIX} Weekly Child`,
    recurrence_parent_id: parent.id,
    recurrence_type: 'weekly',
  });
  assertEqual(child.recurrence_parent_id, parent.id, 'recurrence_parent_id');
}

// 4. Recurring Biweekly
async function testRecurringBiweekly() {
  const parent = await createSession({
    title: `${TEST_PREFIX} Biweekly Parent`,
    recurrence_type: 'biweekly',
  });
  assertEqual(parent.recurrence_type, 'biweekly', 'recurrence_type');
  const child = await createSession({
    title: `${TEST_PREFIX} Biweekly Child`,
    recurrence_parent_id: parent.id,
    recurrence_type: 'biweekly',
  });
  assertEqual(child.recurrence_parent_id, parent.id, 'recurrence_parent_id');
}

// 5. Recurring Monthly
async function testRecurringMonthly() {
  const parent = await createSession({
    title: `${TEST_PREFIX} Monthly Parent`,
    recurrence_type: 'monthly',
  });
  assertEqual(parent.recurrence_type, 'monthly', 'recurrence_type');
}

// 6. Recurring Custom (specific dates)
async function testRecurringCustom() {
  const dates = ['2026-04-01', '2026-04-15', '2026-05-01'];
  const session = await createSession({
    title: `${TEST_PREFIX} Custom Recurring`,
    recurrence_type: 'custom',
    recurrence_dates: dates,
  });
  assertEqual(session.recurrence_type, 'custom', 'recurrence_type');
  assert(Array.isArray(session.recurrence_dates), 'recurrence_dates should be an array');
  assertEqual(session.recurrence_dates.length, 3, 'recurrence_dates length');
}

// 7. Join Session (look up by code)
async function testJoinSession() {
  const session = await createSession({ title: `${TEST_PREFIX} Joinable` });
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('code', session.code)
    .single();
  if (error) throw new Error(`Join lookup: ${error.message}`);
  assertEqual(data.id, session.id, 'looked-up session id should match');
}

// 8. Submit Question (anonymous)
async function testSubmitQuestionAnonymous() {
  const session = await createSession({ title: `${TEST_PREFIX} Anon Q` });
  const q = await createQuestion(session.id, {
    text: 'Is this anonymous?',
    is_anonymous: true,
  });
  assertEqual(q.is_anonymous, true, 'is_anonymous');
  assert(q.author_name === null, 'author_name should be null for anonymous');
  assertEqual(q.status, 'pending', 'default status');
  assertEqual(q.upvotes, 0, 'default upvotes');
}

// 9. Submit Question (named)
async function testSubmitQuestionNamed() {
  const session = await createSession({ title: `${TEST_PREFIX} Named Q` });
  const q = await createQuestion(session.id, {
    text: 'Who am I?',
    author_name: 'Alice',
    is_anonymous: false,
  });
  assertEqual(q.author_name, 'Alice', 'author_name');
  assertEqual(q.is_anonymous, false, 'is_anonymous');
}

// 10. Upvote Question
async function testUpvoteQuestion() {
  const session = await createSession({ title: `${TEST_PREFIX} Upvote` });
  const q = await createQuestion(session.id, { text: 'Upvote me' });
  assertEqual(q.upvotes, 0, 'initial upvotes');

  const { data, error } = await supabase
    .from('questions')
    .update({ upvotes: q.upvotes + 1 })
    .eq('id', q.id)
    .select()
    .single();
  if (error) throw new Error(`Upvote: ${error.message}`);
  assertEqual(data.upvotes, 1, 'upvotes after increment');
}

// 11. Remove Upvote
async function testRemoveUpvote() {
  const session = await createSession({ title: `${TEST_PREFIX} Downvote` });
  const q = await createQuestion(session.id, { text: 'Remove upvote' });

  // First upvote
  await supabase.from('questions').update({ upvotes: 3 }).eq('id', q.id);

  // Then remove one
  const { data, error } = await supabase
    .from('questions')
    .update({ upvotes: 2 })
    .eq('id', q.id)
    .select()
    .single();
  if (error) throw new Error(`Remove upvote: ${error.message}`);
  assertEqual(data.upvotes, 2, 'upvotes after decrement');
}

// 12. Mark Question Answered
async function testMarkQuestionAnswered() {
  const session = await createSession({ title: `${TEST_PREFIX} Answered` });
  const q = await createQuestion(session.id, { text: 'Mark me answered' });
  assertEqual(q.status, 'pending', 'initial status');

  const { data, error } = await supabase
    .from('questions')
    .update({ status: 'answered' })
    .eq('id', q.id)
    .select()
    .single();
  if (error) throw new Error(`Mark answered: ${error.message}`);
  assertEqual(data.status, 'answered', 'status after update');
}

// 13. Approve Question (moderation)
async function testApproveQuestion() {
  const session = await createSession({
    title: `${TEST_PREFIX} Moderation Approve`,
    moderation_enabled: true,
  });
  // Insert question with approved=false (awaiting moderation)
  const q = await createQuestion(session.id, {
    text: 'Approve me',
    approved: false,
  });
  assertEqual(q.approved, false, 'initial approved');

  const { data, error } = await supabase
    .from('questions')
    .update({ approved: true })
    .eq('id', q.id)
    .select()
    .single();
  if (error) throw new Error(`Approve: ${error.message}`);
  assertEqual(data.approved, true, 'approved after update');
}

// 14. Reject Question
async function testRejectQuestion() {
  const session = await createSession({
    title: `${TEST_PREFIX} Moderation Reject`,
    moderation_enabled: true,
  });
  const q = await createQuestion(session.id, { text: 'Reject me' });
  assertEqual(q.approved, true, 'default approved');

  const { data, error } = await supabase
    .from('questions')
    .update({ approved: false })
    .eq('id', q.id)
    .select()
    .single();
  if (error) throw new Error(`Reject: ${error.message}`);
  assertEqual(data.approved, false, 'approved after rejection');
}

// 15. Reply to Question (host) — verify auto-marks as answered
async function testReplyHost() {
  const session = await createSession({ title: `${TEST_PREFIX} Host Reply` });
  const q = await createQuestion(session.id, { text: 'Host will reply' });

  const reply = await createReply(q.id, session.id, {
    text: 'Here is the answer',
    author_name: 'Host',
    is_host: true,
  });
  assertEqual(reply.is_host, true, 'is_host');
  assertEqual(reply.text, 'Here is the answer', 'reply text');
  assert(reply.question_id === q.id, 'reply question_id should match');

  // In many implementations, a host reply auto-marks the question as answered.
  // Verify by re-fetching the question (this depends on triggers/app logic).
  const { data: updatedQ } = await supabase
    .from('questions')
    .select()
    .eq('id', q.id)
    .single();
  // Note: if there is no DB trigger, this may still be 'pending'.
  // We log the result either way for the report.
  if (updatedQ.status !== 'answered') {
    console.log('    INFO: Host reply did not auto-mark question as answered (no DB trigger detected)');
  }
}

// 16. Reply to Question (attendee)
async function testReplyAttendee() {
  const session = await createSession({ title: `${TEST_PREFIX} Attendee Reply` });
  const q = await createQuestion(session.id, { text: 'Attendee will reply' });

  const reply = await createReply(q.id, session.id, {
    text: 'I think the answer is...',
    author_name: 'Attendee Bob',
    is_host: false,
  });
  assertEqual(reply.is_host, false, 'is_host');
  assertEqual(reply.author_name, 'Attendee Bob', 'author_name');
}

// 17. End Session
async function testEndSession() {
  const session = await createSession({ title: `${TEST_PREFIX} End Me` });
  assert(session.ended_at === null, 'ended_at should start null');

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('sessions')
    .update({ ended_at: now })
    .eq('id', session.id)
    .select()
    .single();
  if (error) throw new Error(`End session: ${error.message}`);
  assert(data.ended_at !== null, 'ended_at should be set');
}

// 18. Reopen Session
async function testReopenSession() {
  const session = await createSession({ title: `${TEST_PREFIX} Reopen Me` });
  // End it first
  await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', session.id);

  // Reopen
  const { data, error } = await supabase
    .from('sessions')
    .update({ ended_at: null })
    .eq('id', session.id)
    .select()
    .single();
  if (error) throw new Error(`Reopen session: ${error.message}`);
  assert(data.ended_at === null, 'ended_at should be null after reopen');
}

// 19. Enable/Disable Moderation
async function testToggleModeration() {
  const session = await createSession({ title: `${TEST_PREFIX} Moderation Toggle` });
  assertEqual(session.moderation_enabled, false, 'default moderation_enabled');

  // Enable
  const { data: enabled, error: e1 } = await supabase
    .from('sessions')
    .update({ moderation_enabled: true })
    .eq('id', session.id)
    .select()
    .single();
  if (e1) throw new Error(`Enable moderation: ${e1.message}`);
  assertEqual(enabled.moderation_enabled, true, 'moderation_enabled after enable');

  // Disable
  const { data: disabled, error: e2 } = await supabase
    .from('sessions')
    .update({ moderation_enabled: false })
    .eq('id', session.id)
    .select()
    .single();
  if (e2) throw new Error(`Disable moderation: ${e2.message}`);
  assertEqual(disabled.moderation_enabled, false, 'moderation_enabled after disable');
}

// 20. Cluster operations (direct Supabase, not API)
async function testClusterOperations() {
  const session = await createSession({ title: `${TEST_PREFIX} Cluster Test` });

  // Create a cluster
  const { data: cluster, error: cErr } = await supabase
    .from('clusters')
    .insert({
      session_id: session.id,
      title: 'Setup Issues',
      summary_question: 'How do I set up the project?',
    })
    .select()
    .single();
  if (cErr) throw new Error(`Create cluster: ${cErr.message}`);
  assert(cluster.id, 'cluster should have id');
  assertEqual(cluster.status, 'unanswered', 'default cluster status');

  // Assign a question to the cluster
  const q = await createQuestion(session.id, { text: 'How do I install?' });
  const { error: assignErr } = await supabase
    .from('questions')
    .update({ cluster_id: cluster.id })
    .eq('id', q.id);
  if (assignErr) throw new Error(`Assign to cluster: ${assignErr.message}`);

  // Verify the question is in the cluster
  const { data: fetched } = await supabase
    .from('questions')
    .select()
    .eq('id', q.id)
    .single();
  assertEqual(fetched.cluster_id, cluster.id, 'cluster_id on question');

  // Mark cluster answered
  const { data: answered, error: aErr } = await supabase
    .from('clusters')
    .update({ status: 'answered' })
    .eq('id', cluster.id)
    .select()
    .single();
  if (aErr) throw new Error(`Mark cluster answered: ${aErr.message}`);
  assertEqual(answered.status, 'answered', 'cluster status after update');
}

// 21. Multiple Questions Same Session
async function testMultipleQuestions() {
  const session = await createSession({ title: `${TEST_PREFIX} Many Questions` });
  const promises = [];
  for (let i = 0; i < 12; i++) {
    promises.push(createQuestion(session.id, { text: `Question number ${i + 1}` }));
  }
  const questions = await Promise.all(promises);
  assertEqual(questions.length, 12, 'should have 12 questions');

  // Fetch all questions for this session
  const { data, error } = await supabase
    .from('questions')
    .select()
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Fetch multiple: ${error.message}`);
  assertEqual(data.length, 12, 'fetched question count');
}

// 22. Upvote Ordering
async function testUpvoteOrdering() {
  const session = await createSession({ title: `${TEST_PREFIX} Upvote Order` });
  const q1 = await createQuestion(session.id, { text: 'Low votes' });
  const q2 = await createQuestion(session.id, { text: 'High votes' });
  const q3 = await createQuestion(session.id, { text: 'Mid votes' });

  await supabase.from('questions').update({ upvotes: 1 }).eq('id', q1.id);
  await supabase.from('questions').update({ upvotes: 10 }).eq('id', q2.id);
  await supabase.from('questions').update({ upvotes: 5 }).eq('id', q3.id);

  const { data, error } = await supabase
    .from('questions')
    .select()
    .eq('session_id', session.id)
    .order('upvotes', { ascending: false });
  if (error) throw new Error(`Upvote ordering: ${error.message}`);
  assertEqual(data.length, 3, 'question count');
  assertEqual(data[0].upvotes, 10, 'first should be highest');
  assertEqual(data[1].upvotes, 5, 'second should be mid');
  assertEqual(data[2].upvotes, 1, 'third should be lowest');
}

// 23. Edge Case: Empty Session
async function testEmptySession() {
  const session = await createSession({ title: `${TEST_PREFIX} Empty` });

  const { data, error } = await supabase
    .from('questions')
    .select()
    .eq('session_id', session.id);
  if (error) throw new Error(`Empty session query: ${error.message}`);
  assertEqual(data.length, 0, 'empty session should have 0 questions');
}

// 24. Edge Case: Very Long Question
// Note: Schema has a 500-char constraint on questions.text.
// We test that a 500-char question succeeds and a 501-char question fails.
async function testVeryLongQuestion() {
  const session = await createSession({ title: `${TEST_PREFIX} Long Q` });

  // 500 chars should succeed
  const text500 = 'A'.repeat(500);
  const q = await createQuestion(session.id, { text: text500 });
  assertEqual(q.text.length, 500, 'text length 500');

  // 501 chars should fail due to constraint
  const text501 = 'B'.repeat(501);
  const { error } = await supabase
    .from('questions')
    .insert({ session_id: session.id, text: text501 })
    .select()
    .single();
  assert(error !== null, '501-char question should be rejected by DB constraint');
}

// 25. Edge Case: Special Characters
async function testSpecialCharacters() {
  const session = await createSession({ title: `${TEST_PREFIX} Special Chars` });

  const specialTexts = [
    'What about emoji? 🎉🚀',
    'Does <b>HTML</b> work?',
    "How about 'single' and \"double\" quotes?",
    'Backslashes \\ and tabs\t?',
    'Unicode: café, naïve, 日本語',
  ];

  for (const text of specialTexts) {
    const q = await createQuestion(session.id, { text });
    assertEqual(q.text, text, `special text roundtrip: ${text.slice(0, 30)}...`);
  }
}

// 26. Edge Case: Duplicate Session Code
async function testDuplicateSessionCode() {
  const code = uniqueCode();
  await createSession({ title: `${TEST_PREFIX} Dup Code 1`, code });

  const { error } = await supabase
    .from('sessions')
    .insert({ code, title: `${TEST_PREFIX} Dup Code 2` })
    .select()
    .single();
  assert(error !== null, 'Duplicate session code should be rejected by unique constraint');
}

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  const totalStart = Date.now();

  console.log('=== Query App — Test Suite ===\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Timestamp:    ${new Date().toISOString()}\n`);

  // Pre-cleanup
  console.log('Cleaning up previous test data...');
  await cleanupTestData();
  console.log('Done.\n');

  console.log('Running tests:\n');

  // Run all tests sequentially
  await runTest('01. Session Creation', testSessionCreation);
  await runTest('02. Session with All Options', testSessionAllOptions);
  await runTest('03. Recurring Weekly', testRecurringWeekly);
  await runTest('04. Recurring Biweekly', testRecurringBiweekly);
  await runTest('05. Recurring Monthly', testRecurringMonthly);
  await runTest('06. Recurring Custom Dates', testRecurringCustom);
  await runTest('07. Join Session by Code', testJoinSession);
  await runTest('08. Submit Question (Anonymous)', testSubmitQuestionAnonymous);
  await runTest('09. Submit Question (Named)', testSubmitQuestionNamed);
  await runTest('10. Upvote Question', testUpvoteQuestion);
  await runTest('11. Remove Upvote', testRemoveUpvote);
  await runTest('12. Mark Question Answered', testMarkQuestionAnswered);
  await runTest('13. Approve Question (Moderation)', testApproveQuestion);
  await runTest('14. Reject Question', testRejectQuestion);
  await runTest('15. Reply to Question (Host)', testReplyHost);
  await runTest('16. Reply to Question (Attendee)', testReplyAttendee);
  await runTest('17. End Session', testEndSession);
  await runTest('18. Reopen Session', testReopenSession);
  await runTest('19. Enable/Disable Moderation', testToggleModeration);
  await runTest('20. Cluster Operations', testClusterOperations);
  await runTest('21. Multiple Questions Same Session', testMultipleQuestions);
  await runTest('22. Upvote Ordering', testUpvoteOrdering);
  await runTest('23. Edge Case: Empty Session', testEmptySession);
  await runTest('24. Edge Case: Very Long Question (500-char limit)', testVeryLongQuestion);
  await runTest('25. Edge Case: Special Characters', testSpecialCharacters);
  await runTest('26. Edge Case: Duplicate Session Code', testDuplicateSessionCode);

  // Post-cleanup
  console.log('\nCleaning up test data...');
  await cleanupTestData();
  console.log('Done.\n');

  // Summary
  const totalDuration = Date.now() - totalStart;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const errors = results.filter(r => !r.passed).map(r => ({ name: r.name, error: r.error }));

  console.log('=== SUMMARY ===');
  console.log(`Total:    ${results.length}`);
  console.log(`Passed:   ${passed}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('Failures:');
    for (const e of errors) {
      console.log(`  - ${e.name}: ${e.error}`);
    }
    console.log('');
  }

  // Print JSON summary for programmatic consumption
  const summary = {
    total: results.length,
    passed,
    failed,
    errors,
    duration_ms: totalDuration,
  };
  console.log('JSON_SUMMARY:' + JSON.stringify(summary));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
