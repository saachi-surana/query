import { batchClusterSession, getSessionContext } from '../lib/clustering'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { supabaseAdmin as supabase } from '../lib/supabase-admin'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SESSION_CODE = 'DEMO01'
const CLUSTER_API = 'http://localhost:3000/api/cluster'

const QUESTIONS = [
  'What is the base salary range for new grad software engineers?',
  'How does the interview process work end to end?',
  'What does a typical day look like for engineers?',
  'Is there remote work or hybrid flexibility?',
  'What tech stack does the engineering team use?',
  'How long does it take to hear back after the final round?',
  'What is the culture like on the engineering team?',
  'Are there return offer opportunities for interns?',
  'How does performance review and promotion work?',
  'What are the biggest technical challenges the team is facing?',
  'Is there mentorship for new employees?',
  'How much ownership do junior engineers get over projects?',
  'What benefits and perks does the company offer?',
  'How collaborative is the work environment day to day?',
  'What growth opportunities exist for early career engineers?',
]

async function main() {
  console.log('Seeding demo session...\n')

  // Clean up any existing DEMO01 session to make the script idempotent
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('code', SESSION_CODE)
    .maybeSingle()

  if (existing) {
    await supabase.from('questions').delete().eq('session_id', existing.id)
    await supabase.from('clusters').delete().eq('session_id', existing.id)
    await supabase.from('sessions').delete().eq('id', existing.id)
    console.log('Removed existing DEMO01 session.\n')
  }

  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      code: SESSION_CODE,
      title: 'Tech Company Recruiting AMA',
      description: 'Live Q&A for prospective engineering candidates',
      status: 'active',
    })
    .select('id, code')
    .single()

  if (sessionErr || !session) {
    console.error('Failed to create session:', sessionErr)
    process.exit(1)
  }
  console.log(`Created session: ${session.code} (id: ${session.id})\n`)

  // Insert all questions — only columns guaranteed in the base schema
  const questionRows = QUESTIONS.map((text) => ({
    session_id: session.id,
    text,
    is_anonymous: false,
  }))

  const { data: questions, error: questionsErr } = await supabase
    .from('questions')
    .insert(questionRows)
    .select('id, text')

  if (questionsErr || !questions) {
    console.error('Failed to insert questions:', questionsErr)
    process.exit(1)
  }
  console.log(`Inserted ${questions.length} questions.\n`)

  // Cluster all questions in one batch API call
  console.log('Clustering all questions (direct mode)...')

// 1. Get the session context required for clustering
const sessionContext = await getSessionContext(session.id)

// 2. Call the logic directly (no network request, no auth interference)
const result = await batchClusterSession(
  session.id,
  'Live Q&A for prospective engineering candidates',
  sessionContext
)

console.log('  Clustering complete:', JSON.stringify(result))

  console.log('\nDone. Demo session DEMO01 is ready.')
  console.log(`  Moderator view: http://localhost:3000/session/${SESSION_CODE}`)
  console.log(`  Attendee view:  http://localhost:3000/join/${SESSION_CODE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
