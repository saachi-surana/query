/**
 * End-to-end test for the clustering pipeline.
 * Run with: node tests/clustering-test.mjs
 * Requires the dev server running on localhost:3000.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Parse .env.local ──────────────────────────────────────────────
const envPath = resolve(__dirname, '..', '.env.local')
const envVars = {}
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  envVars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
}

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_ANON_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Helpers ───────────────────────────────────────────────────────
function randomCode(len = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const RELATED_QUESTIONS = [
  'What is the company\'s remote work policy?',
  'Can I work from home on Fridays?',
  'Is there a hybrid work option available?',
  'How many days can we work remotely per week?',
  'Are there any restrictions on working from home?',
]

const UNRELATED_QUESTIONS = [
  'What\'s the dress code in the office?',
  'How do I submit an expense report?',
  'When is the next company holiday?',
]

// ── Main test ─────────────────────────────────────────────────────
async function run() {
  const results = { passed: 0, failed: 0, details: [] }
  let sessionId = null

  function assert(label, condition) {
    if (condition) {
      results.passed++
      results.details.push(`  PASS: ${label}`)
    } else {
      results.failed++
      results.details.push(`  FAIL: ${label}`)
    }
  }

  try {
    // 1. Create test session
    console.log('\n1. Creating test session...')
    const code = randomCode()
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({ title: '[TEST] Clustering Test', code, moderation_enabled: false })
      .select('id, code, title')
      .single()

    if (sessErr || !session) {
      console.error('Failed to create session:', sessErr)
      process.exit(1)
    }
    sessionId = session.id
    console.log(`   Session created: id=${sessionId}  code=${code}`)

    // 2. Insert 5 related questions
    console.log('\n2. Inserting 5 related questions (remote work)...')
    const relatedIds = []
    for (const text of RELATED_QUESTIONS) {
      const { data: q, error } = await supabase
        .from('questions')
        .insert({ session_id: sessionId, text, approved: true, is_anonymous: true })
        .select('id')
        .single()
      if (error || !q) {
        console.error('   Failed to insert question:', error)
        process.exit(1)
      }
      relatedIds.push(q.id)
      console.log(`   + ${text}  (${q.id})`)
    }

    // 3. Insert 3 unrelated questions
    console.log('\n3. Inserting 3 unrelated questions...')
    const unrelatedIds = []
    for (const text of UNRELATED_QUESTIONS) {
      const { data: q, error } = await supabase
        .from('questions')
        .insert({ session_id: sessionId, text, approved: true, is_anonymous: true })
        .select('id')
        .single()
      if (error || !q) {
        console.error('   Failed to insert question:', error)
        process.exit(1)
      }
      unrelatedIds.push(q.id)
      console.log(`   + ${text}  (${q.id})`)
    }

    // 4. Call clustering API
    console.log('\n4. Calling POST /api/cluster (batch mode)...')
    let apiRes
    try {
      apiRes = await fetch('http://localhost:3000/api/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId, mode: 'batch' }),
      })
    } catch (fetchErr) {
      console.error('   API call failed (is the dev server running on :3000?):', fetchErr.message)
      process.exit(1)
    }

    const apiBody = await apiRes.json()
    if (!apiRes.ok) {
      console.error('   API returned error:', apiRes.status, JSON.stringify(apiBody, null, 2))
      process.exit(1)
    }
    console.log('   API response:', JSON.stringify(apiBody, null, 2))
    assert('API returned success=true', apiBody.success === true)

    // 5. Wait for processing
    console.log('\n5. Waiting 5 seconds for processing...')
    await sleep(5000)

    // 6. Fetch questions and check clustering
    console.log('\n6. Fetching questions and verifying clusters...')
    const { data: questions } = await supabase
      .from('questions')
      .select('id, text, cluster_id')
      .eq('session_id', sessionId)

    const clustered = questions.filter((q) => q.cluster_id !== null)
    const clusterIds = [...new Set(clustered.map((q) => q.cluster_id))]

    console.log(`   Total questions: ${questions.length}`)
    console.log(`   Clustered: ${clustered.length}`)
    console.log(`   Distinct clusters: ${clusterIds.length}`)

    assert('All 8 questions exist', questions.length === 8)
    assert('At least 5 questions are clustered', clustered.length >= 5)
    assert('At least 2 distinct clusters created', clusterIds.length >= 2)

    // Check if the remote-work questions ended up in the same cluster
    const relatedClusterIds = questions
      .filter((q) => relatedIds.includes(q.id) && q.cluster_id)
      .map((q) => q.cluster_id)
    const uniqueRelatedClusters = [...new Set(relatedClusterIds)]
    console.log(`   Related questions cluster IDs: ${JSON.stringify(uniqueRelatedClusters)}`)
    assert(
      'All related (remote-work) questions are in the same cluster',
      uniqueRelatedClusters.length === 1 && relatedClusterIds.length === 5
    )

    // 7. Fetch clusters and log details
    console.log('\n7. Fetching clusters for the session...')
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id, title, summary_question')
      .eq('session_id', sessionId)

    if (clusters && clusters.length > 0) {
      for (const c of clusters) {
        const qCount = questions.filter((q) => q.cluster_id === c.id).length
        console.log(`   Cluster: "${c.title}"`)
        console.log(`     Summary: ${c.summary_question}`)
        console.log(`     Questions: ${qCount}`)
      }
    } else {
      console.log('   No clusters found!')
    }
    assert('Clusters array is non-empty', clusters && clusters.length > 0)

  } catch (err) {
    console.error('\nUnexpected error:', err)
    results.failed++
    results.details.push(`  FAIL: Unexpected error — ${err.message}`)
  } finally {
    // 8. Cleanup
    if (sessionId) {
      console.log('\n8. Cleaning up test data...')
      // Delete questions and clusters first, then session
      await supabase.from('questions').delete().eq('session_id', sessionId)
      await supabase.from('clusters').delete().eq('session_id', sessionId)
      const { error: delErr } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (delErr) {
        console.log(`   Cleanup warning: ${delErr.message}`)
      } else {
        console.log('   Test session deleted.')
      }
    }

    // 9. Summary
    console.log('\n' + '='.repeat(50))
    console.log('CLUSTERING TEST RESULTS')
    console.log('='.repeat(50))
    for (const d of results.details) console.log(d)
    console.log('-'.repeat(50))
    console.log(`Passed: ${results.passed}   Failed: ${results.failed}`)
    console.log(results.failed === 0 ? '\n>>> PASS <<<' : '\n>>> FAIL <<<')
    console.log('='.repeat(50))
    process.exit(results.failed === 0 ? 0 : 1)
  }
}

run()
