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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
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
    throw new Error('No AI provider configured')
  }

  const provider = getProvider()

  if (provider === 'gemini') {
    try {
      return await geminiComplete(prompt, systemPrompt)
    } catch (err) {
      // If Anthropic key is available, fall back
      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (anthropicKey && anthropicKey !== 'sk-ant-placeholder') {
        console.warn('Gemini failed, falling back to Anthropic:', err instanceof Error ? err.message : err)
        return await anthropicComplete(prompt, systemPrompt)
      }
      throw err
    }
  }

  // Anthropic primary
  return await anthropicComplete(prompt, systemPrompt)
}
