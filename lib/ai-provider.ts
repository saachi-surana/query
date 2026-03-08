// Determines which AI provider to use based on env vars
// Priority: GEMINI_API_KEY > ANTHROPIC_API_KEY

export type AIProvider = 'gemini' | 'anthropic'

export function getProvider(): AIProvider {
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'gemini' // default
}

function hasAnyKey(): boolean {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const hasGemini = !!geminiKey && geminiKey !== ''
  const hasAnthropic = !!anthropicKey && anthropicKey !== 'sk-ant-placeholder'
  return hasGemini || hasAnthropic
}

async function geminiComplete(prompt: string, systemPrompt?: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'
  const model = genAI.getGenerativeModel({ model: modelName })
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
  const result = await model.generateContent(fullPrompt)
  return result.response.text()
}

async function anthropicComplete(prompt: string, systemPrompt?: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt || '',
    messages: [{ role: 'user', content: prompt }],
  })
  return (msg.content[0] as { type: string; text: string }).text
}

export async function aiComplete(prompt: string, systemPrompt?: string): Promise<string> {
  if (!hasAnyKey()) {
    console.error('aiComplete: No AI provider configured. GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'MISSING', 'ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING')
    throw new Error('No AI provider configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in your environment variables.')
  }

  const provider = getProvider()
  console.log('aiComplete: Using provider:', provider)

  if (provider === 'gemini') {
    try {
      const result = await geminiComplete(prompt, systemPrompt)
      console.log('aiComplete: Gemini returned', result.length, 'chars')
      return result
    } catch (err) {
      console.error('aiComplete: Gemini failed:', err instanceof Error ? err.message : err)
      throw err
    }
  }

  // Anthropic primary
  try {
    const result = await anthropicComplete(prompt, systemPrompt)
    console.log('aiComplete: Anthropic returned', result.length, 'chars')
    return result
  } catch (err) {
    console.error('aiComplete: Anthropic failed:', err instanceof Error ? err.message : err)
    throw err
  }
}
