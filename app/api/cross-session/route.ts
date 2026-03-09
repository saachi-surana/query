import { NextRequest, NextResponse } from 'next/server'
import { pullPreviousSessionContext, getRecurringSessionInsights, generateAIInsights } from '@/lib/cross-session'

export async function POST(req: NextRequest) {
  try {
    const { sessionId, action } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    if (action === 'pull-context') {
      const count = await pullPreviousSessionContext(sessionId)
      return NextResponse.json({ success: true, contextEntriesCreated: count })
    }

    if (action === 'insights') {
      const insights = await getRecurringSessionInsights(sessionId)
      return NextResponse.json({ success: true, insights })
    }

    if (action === 'ai-insights') {
      const insights = await getRecurringSessionInsights(sessionId)
      if (!insights) {
        return NextResponse.json({ success: true, text: 'This session is not part of a recurring series.' })
      }
      const text = await generateAIInsights(sessionId, insights)
      return NextResponse.json({ success: true, text, insights })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Cross-session API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
