import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { questionId, sessionId } = await req.json()
    if (!questionId || !sessionId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const key = process.env.ANTHROPIC_API_KEY
    if (!key || key === 'sk-ant-placeholder') {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    // Get question text
    const { data: question } = await supabase
      .from('questions')
      .select('text')
      .eq('id', questionId)
      .single()
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Get session context
    const { data: session } = await supabase
      .from('sessions')
      .select('description')
      .eq('id', sessionId)
      .single()

    // Get existing FAQ entries for context
    const { data: faqs } = await supabase
      .from('faq_entries')
      .select('summary_question, answer')
      .eq('session_id', sessionId)
      .limit(10)

    const faqContext = faqs && faqs.length > 0
      ? '\n\nPrevious FAQ answers from this session:\n' + faqs.map((f) => `Q: ${f.summary_question}\nA: ${f.answer}`).join('\n\n')
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are a helpful assistant drafting concise answers for a live Q&A session host. Write a brief, clear suggested answer. Be direct and informative. 2-3 sentences max.',
      messages: [{
        role: 'user',
        content: `Session context: ${session?.description || 'A live Q&A session.'}${faqContext}\n\nQuestion from attendee: ${question.text}\n\nDraft a suggested answer:`,
      }],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    if (answer) {
      await supabase
        .from('questions')
        .update({ suggested_answer: answer })
        .eq('id', questionId)
    }

    return NextResponse.json({ success: true, answer })
  } catch {
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 })
  }
}
