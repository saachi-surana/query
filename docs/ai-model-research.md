# AI Model Research for Query

> **Date**: March 2026
> **Purpose**: Evaluate free-tier AI APIs and open-source models for real-time question clustering and summarization in Query's live Q&A product.

---

## 1. Free-Tier AI API Comparison

### 1.1 OpenAI

| Detail | Info |
|--------|------|
| **Free tier** | $5 in free credits for new users (no credit card required), expires after 3 months |
| **Cheapest model** | GPT-5 Nano: $0.05 input / $0.40 output per 1M tokens |
| **GPT-4o-mini** | $0.15 input / $0.60 output per 1M tokens |
| **GPT-4o** | $2.50 input / $10.00 output per 1M tokens |
| **Rate limits (free)** | Tier 1 after credits, ~500 RPM for GPT-4o-mini |
| **Best for Query** | GPT-5 Nano or GPT-4o-mini — excellent quality-to-cost ratio for clustering + summarization |
| **Setup difficulty** | Very Easy — well-documented SDK, OpenAI-compatible API |

**Notes**: GPT-5 Nano is the best value option from OpenAI. At $0.05/1M input tokens, processing 1,000 questions (~50K tokens) costs less than $0.01. GPT-4o-mini remains a strong choice with vision capabilities if needed.

---

### 1.2 Anthropic Claude

| Detail | Info |
|--------|------|
| **Free tier** | $5 in free credits for new API users (no credit card required, no expiration) |
| **Claude Haiku 4.5** | $1.00 input / $5.00 output per 1M tokens |
| **Claude Sonnet 4.5** | $3.00 input / $15.00 output per 1M tokens |
| **Claude Opus 4.5** | $5.00 input / $25.00 output per 1M tokens |
| **Batch API** | 50% discount on all models for non-urgent workloads |
| **Prompt caching** | Reduces costs by reusing previously processed prompt portions |
| **Rate limits (free)** | Limited RPM on free credits |
| **Best for Query** | Haiku 4.5 — already integrated in Query's clustering pipeline |
| **Setup difficulty** | Very Easy — already in use |

**Notes**: Query already uses Claude Haiku for clustering. The $5 free credits with no expiration are generous. Haiku at $1/1M input is more expensive than GPT-5 Nano ($0.05) or Gemini Flash ($0.10-$0.30), but the existing integration reduces switching cost. Prompt caching could significantly reduce costs for repeated clustering patterns.

---

### 1.3 Google Gemini

| Detail | Info |
|--------|------|
| **Free tier** | Genuinely free — no credit card required, 5-15 RPM, up to 1,000 requests/day |
| **Free models** | Gemini 2.5 Flash, Gemini 3 Flash Preview, and 4+ others |
| **Gemini 2.5 Flash (paid)** | $0.30 input / $2.50 output per 1M tokens |
| **Gemini 2.5 Flash-Lite** | $0.10 input / $0.40 output per 1M tokens |
| **Gemini 3 Flash (paid)** | $0.50 input / $3.00 output per 1M tokens |
| **Rate limits (free)** | 5-15 RPM, 1,000 requests/day |
| **Best for Query** | Gemini 2.5 Flash-Lite — cheapest high-quality option; free tier for prototyping |
| **Setup difficulty** | Easy — Google AI SDK, OpenAI-compatible endpoint available |

**Notes**: Google offers the most generous free tier in the industry. The free tier alone (1,000 requests/day) could handle a moderate number of Query sessions at no cost. Gemini Flash-Lite at $0.10/1M input is extremely competitive. Caveat: free tier data may be used by Google for model improvement — avoid sending sensitive content through free tier.

---

### 1.4 Groq

| Detail | Info |
|--------|------|
| **Free tier** | Yes — free access to all models, rate-limited |
| **Llama 3.1 8B** | $0.05 input / $0.08 output per 1M tokens |
| **Llama 3.3 70B** | ~$0.60 input / $0.80 output per 1M tokens |
| **Mixtral 8x7B** | ~$0.24 input / $0.24 output per 1M tokens |
| **Available models** | Llama 3.x (8B, 70B), Mixtral, Gemma, DeepSeek R1, Whisper |
| **Key advantage** | Ultra-fast inference via LPU — lowest latency in the industry |
| **Rate limits (free)** | Limited RPM/TPM, 10x higher on Developer tier |
| **Best for Query** | Llama 3.1 8B on Groq — cheapest + fastest option for real-time clustering |
| **Setup difficulty** | Easy — OpenAI-compatible API |

**Notes**: Groq's LPU hardware delivers the fastest inference speeds available. Llama 3.1 8B at $0.05/1M tokens with sub-second latency makes it ideal for real-time clustering. The free tier is generous enough for development and small-scale production. The Developer tier (paid) provides 10x higher rate limits.

---

### 1.5 Together AI

| Detail | Info |
|--------|------|
| **Free tier** | $5-$100 in free credits for new users (varies by promotion) |
| **Startup program** | $15,000-$50,000 in credits based on company stage |
| **Llama 3.1 8B** | ~$0.10 per 1M tokens |
| **Llama 3.3 70B** | ~$0.90 per 1M tokens |
| **Available models** | 200+ open-source models (Llama 4, DeepSeek V3, Qwen, Mixtral, etc.) |
| **Key advantage** | Widest selection of open-source models, serverless + dedicated options |
| **Rate limits (free)** | Based on credit balance |
| **Best for Query** | Llama 3.1 8B — cheap and flexible |
| **Setup difficulty** | Easy — OpenAI-compatible API |

**Notes**: Together AI's strength is model variety. You can experiment with 200+ models without changing your integration. The startup credit program ($15K-$50K) could fund Query's AI usage for months. Good fallback provider if primary provider has issues.

---

### 1.6 Mistral AI

| Detail | Info |
|--------|------|
| **Free tier** | Yes — free experimentation tier on La Plateforme, no credit card required |
| **Free tier limits** | ~1 RPS, 500K tokens/minute, up to 1B tokens/month |
| **Mistral Small 3.1** | $0.03 input / $0.11 output per 1M tokens |
| **Mistral Large** | Higher pricing, enterprise-focused |
| **Startup program** | Up to $30,000 in direct credits |
| **Rate limits (free)** | 1 RPS, 500K TPM, 1B tokens/month |
| **Best for Query** | Mistral Small 3.1 — incredibly cheap at $0.03/1M input |
| **Setup difficulty** | Easy — OpenAI-compatible API |

**Notes**: Mistral Small 3.1 at $0.03/1M input tokens is one of the cheapest commercial API options available. The free tier with 1B tokens/month is extremely generous — that could handle tens of thousands of clustering operations per month at zero cost. The 1 RPS rate limit is the main constraint for real-time use, but may be sufficient for Query's per-session clustering needs.

---

### 1.7 Cohere

| Detail | Info |
|--------|------|
| **Free tier** | Trial API key: 1,000 free API calls/month |
| **Rate limits (free)** | 5 calls/min (Embed), 20 calls/min (Chat) |
| **Command R+** | $2.50 input / $10.00 output per 1M tokens |
| **Embed 4** | $0.12 per 1M tokens (text embeddings) |
| **Rerank 3.5** | $2.00 per 1,000 searches |
| **Key advantage** | Purpose-built for text analysis: embeddings, reranking, classification |
| **Best for Query** | Embed 4 for similarity detection + Command R for summarization |
| **Setup difficulty** | Easy — dedicated SDK with text analysis focus |

**Notes**: Cohere is uniquely suited for text analysis tasks. Their Embed model could replace the current similarity detection logic, and Rerank could improve cluster quality. However, the free tier is limited (1,000 calls/month) and the production pricing is relatively expensive compared to alternatives. Best used as a specialized embedding provider alongside a cheaper LLM for summarization.

---

## 2. Open-Source Model Recommendations

### 2.1 Llama 3.3 70B / Llama 3.2 (Meta)

| Detail | Info |
|--------|------|
| **Sizes** | 1B, 3B (Llama 3.2), 8B (Llama 3.1), 70B (Llama 3.3), 405B (Llama 3.1) |
| **Best for Query** | 8B for speed/cost, 70B for quality |
| **Where to run** | Groq (free tier), Together AI, Ollama (local), any vLLM host |
| **Context window** | 128K tokens |
| **License** | Llama Community License (free for commercial use under 700M MAU) |
| **Quality: Clustering** | Good (8B) to Excellent (70B) — strong instruction following |
| **Quality: Summarization** | Good (8B) to Excellent (70B) — 3B model outperforms Gemma 2 2.6B |
| **Setup steps** | 1. Sign up at groq.com (free) 2. Get API key 3. Use OpenAI-compatible SDK 4. Model: `llama-3.1-8b-instant` |
| **Cost** | Free on Groq free tier; $0.05/1M tokens on Groq paid; $0.10/1M on Together AI |

**Recommendation**: Best all-around open-source choice. The 8B model on Groq gives the best speed-to-cost ratio. Use 70B for higher quality clustering when budget allows.

---

### 2.2 Mistral 7B / Mixtral 8x7B (Mistral AI)

| Detail | Info |
|--------|------|
| **Sizes** | 7B (Mistral 7B), 46.7B/12.9B active (Mixtral 8x7B MoE) |
| **Best for Query** | Mixtral 8x7B — MoE architecture gives 70B-class quality at lower cost |
| **Where to run** | Mistral API (free tier), Groq, Together AI, Ollama (local), vLLM |
| **Context window** | 32K tokens (Mixtral), 32K (Mistral 7B) |
| **License** | Apache 2.0 (fully permissive) |
| **Quality: Clustering** | Good — outperforms Llama 2 70B, matches GPT-3.5 |
| **Quality: Summarization** | Good — strong multilingual support (EN, FR, DE, ES, IT) |
| **Setup steps** | 1. Sign up at mistral.ai (free) 2. Get API key 3. Use OpenAI-compatible SDK 4. Model: `mistral-small-latest` |
| **Cost** | Free on Mistral free tier; $0.03/1M input on paid; $0.24/1M on Groq |

**Recommendation**: Excellent value via Mistral's own API. The free tier (1B tokens/month) is generous. Mixtral's MoE architecture provides strong quality while keeping costs low.

---

### 2.3 Phi-3.5 Mini (Microsoft)

| Detail | Info |
|--------|------|
| **Sizes** | 3.8B (Phi-3.5-mini), 4.15B (vision), 6.6B active / 41.9B total (MoE) |
| **Best for Query** | Phi-3.5-mini-instruct — small, fast, surprisingly capable |
| **Where to run** | Azure AI, NVIDIA NIM, Ollama (local), Hugging Face |
| **Context window** | 128K tokens |
| **License** | MIT License (fully permissive, commercial use allowed) |
| **Quality: Clustering** | Good — matches or exceeds larger models on many benchmarks |
| **Quality: Summarization** | Good — strong instruction following despite small size |
| **Setup steps** | 1. `ollama pull phi3.5` for local 2. Or use Azure AI Foundry for cloud 3. OpenAI-compatible API available via NVIDIA NIM |
| **Cost** | Free (local via Ollama), Azure AI pricing varies |

**Recommendation**: Best option for local/edge deployment. At 3.8B parameters it runs on consumer hardware including laptops. MIT license means zero restrictions. Quality punches well above its weight class.

---

### 2.4 Qwen 2.5 (Alibaba)

| Detail | Info |
|--------|------|
| **Sizes** | 0.5B, 1.5B, 3B, 7B, 14B, 32B, 72B |
| **Best for Query** | 7B or 14B — matches GPT-3.5 performance on consumer hardware |
| **Where to run** | Alibaba Cloud API, Together AI, Ollama (local), Hugging Face |
| **Context window** | 128K tokens (extended context versions) |
| **License** | Apache 2.0 (most sizes), Qwen License (72B) |
| **Quality: Clustering** | Very Good — strong structured data understanding, JSON output |
| **Quality: Summarization** | Very Good — excels at long text generation (8K+ tokens), MMLU 85+ |
| **Setup steps** | 1. Sign up at Alibaba Cloud Model Studio 2. Get API key 3. OpenAI-compatible API 4. Or `ollama pull qwen2.5:7b` for local |
| **Cost** | $2.00/1M input via Alibaba Cloud (Max); much cheaper for smaller models via Together AI |

**Recommendation**: Strongest open-source model for structured data and JSON output, which is exactly what clustering needs. The 7B model is an excellent balance of quality and speed. Native structured output support reduces parsing errors.

---

### 2.5 Gemma 2 (Google)

| Detail | Info |
|--------|------|
| **Sizes** | 2B, 7B (Gemma 1), 9B, 27B (Gemma 2) |
| **Best for Query** | 9B — trained on 8 trillion tokens, strong performance |
| **Where to run** | Google AI Studio (free), Groq (free tier), Ollama (local), Hugging Face |
| **Context window** | 8K tokens (base), varies by deployment |
| **License** | Gemma Terms of Use (free for commercial use, some restrictions) |
| **Quality: Clustering** | Good — strong text understanding capabilities |
| **Quality: Summarization** | Good — purpose-built for text generation tasks including summarization |
| **Setup steps** | 1. Available on Groq free tier 2. Or `ollama pull gemma2:9b` for local 3. Or use Google AI Studio |
| **Cost** | Free on Groq free tier; free on Google AI Studio with limits |

**Recommendation**: Solid option especially when accessed via Groq for free. The 9B model offers good quality. However, the 8K context window is a limitation compared to Llama's 128K. Best as a secondary option.

---

## 3. Comparison Table

| Provider | Model | Free Tier | Input $/1M | Output $/1M | Clustering Quality | Summarization Quality | Rate Limits (Free) | Setup Difficulty |
|----------|-------|-----------|------------|-------------|--------------------|-----------------------|--------------------|------------------|
| **Google Gemini** | Flash-Lite 2.5 | 1,000 req/day | $0.10 | $0.40 | Very Good | Very Good | 5-15 RPM | Easy |
| **Mistral** | Small 3.1 | 1B tokens/mo | $0.03 | $0.11 | Good | Good | 1 RPS | Easy |
| **OpenAI** | GPT-5 Nano | $5 credits | $0.05 | $0.40 | Good | Very Good | Tier 1 limits | Very Easy |
| **Groq** | Llama 3.1 8B | Yes (rate-limited) | $0.05 | $0.08 | Good | Good | Limited RPM | Easy |
| **OpenAI** | GPT-4o-mini | $5 credits | $0.15 | $0.60 | Very Good | Very Good | Tier 1 limits | Very Easy |
| **Together AI** | Llama 3.1 8B | $5-$100 credits | $0.10 | $0.10 | Good | Good | Credit-based | Easy |
| **Groq** | Mixtral 8x7B | Yes (rate-limited) | $0.24 | $0.24 | Good | Good | Limited RPM | Easy |
| **Google Gemini** | Flash 2.5 | 1,000 req/day | $0.30 | $2.50 | Excellent | Excellent | 5-15 RPM | Easy |
| **Anthropic** | Haiku 4.5 | $5 credits | $1.00 | $5.00 | Excellent | Excellent | Limited RPM | Very Easy (already integrated) |
| **Cohere** | Command R+ | 1,000 calls/mo | $2.50 | $10.00 | Excellent | Very Good | 20 RPM | Easy |
| **Cohere** | Embed 4 | 1,000 calls/mo | $0.12 | N/A | Excellent (embeddings) | N/A | 5 RPM | Easy |
| **Alibaba** | Qwen 2.5-Max | API credits | $2.00 | $6.00 | Very Good | Very Good | Varies | Moderate |

### Sorted by cost-effectiveness for Query's use case:

1. **Mistral Small 3.1** — $0.03/1M input, free tier with 1B tokens/month
2. **Groq Llama 3.1 8B** — $0.05/1M input, free tier, fastest inference
3. **OpenAI GPT-5 Nano** — $0.05/1M input, good quality
4. **Google Gemini Flash-Lite** — $0.10/1M input, generous free tier
5. **OpenAI GPT-4o-mini** — $0.15/1M input, strong all-around quality

---

## 4. Final Recommendation for Query

### Context
Query needs AI for two primary tasks:
1. **Real-time question clustering** — grouping similar questions as they arrive during live Q&A sessions
2. **Summary question generation** — creating a concise representative question for each cluster

Requirements: low latency (< 2 seconds), low cost, good quality, easy integration, reliable uptime.

### Recommended Architecture: Multi-Provider with Fallback

#### Primary: Groq (Llama 3.1 8B)
- **Why**: Fastest inference in the industry (sub-500ms), free tier available, $0.05/1M tokens paid
- **Use for**: Real-time clustering during live sessions where latency matters most
- **Integration**: OpenAI-compatible API — minimal code changes from current Claude integration

#### Secondary/Fallback: Google Gemini Flash-Lite
- **Why**: Most generous free tier (1,000 requests/day free), $0.10/1M paid, very good quality
- **Use for**: Fallback when Groq is unavailable or rate-limited; batch re-clustering operations
- **Integration**: Google AI SDK or OpenAI-compatible endpoint

#### Quality Option: Anthropic Claude Haiku (Current)
- **Why**: Already integrated, excellent clustering quality, proven in production
- **Use for**: High-stakes sessions where quality matters more than cost, or as a quality benchmark
- **Cost consideration**: At $1.00/1M input, it is 20x more expensive than Groq Llama 3.1 8B

#### For Embeddings/Similarity: Consider Cohere Embed 4
- **Why**: Purpose-built for text similarity, $0.12/1M tokens
- **Use for**: Pre-filtering similar questions before LLM clustering (reduces LLM calls)
- **Alternative**: Use sentence-transformers locally (all-MiniLM-L6-v2) for zero-cost similarity

### Cost Projections

| Scenario | Questions/Session | Sessions/Month | Groq Cost | Gemini Cost | Claude Haiku Cost |
|----------|-------------------|----------------|-----------|-------------|-------------------|
| Small | 50 | 10 | ~$0.01 | ~$0.02 | ~$0.25 |
| Medium | 200 | 50 | ~$0.10 | ~$0.20 | ~$5.00 |
| Large | 500 | 200 | ~$1.00 | ~$2.00 | ~$50.00 |
| Enterprise | 1,000 | 500 | ~$5.00 | ~$10.00 | ~$250.00 |

*Estimates assume ~500 tokens per clustering request (question text + prompt + response).*

### Implementation Plan

1. **Phase 1**: Add provider abstraction layer (supports OpenAI-compatible APIs)
2. **Phase 2**: Add Groq as primary provider, keep Claude as fallback
3. **Phase 3**: Add Gemini as secondary fallback
4. **Phase 4**: Add environment variable configuration for provider selection
5. **Phase 5**: Monitor quality metrics and adjust provider priorities

### Environment Variables

```env
# AI Provider Configuration
AI_PRIMARY_PROVIDER=groq          # groq | openai | anthropic | gemini | mistral | together
AI_PRIMARY_MODEL=llama-3.1-8b-instant
AI_FALLBACK_PROVIDER=gemini
AI_FALLBACK_MODEL=gemini-2.5-flash-lite
AI_QUALITY_PROVIDER=anthropic     # Used for high-priority sessions
AI_QUALITY_MODEL=claude-haiku-4-5

# API Keys
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
# ANTHROPIC_API_KEY already exists
```

### Bottom Line

**Switch from Claude Haiku ($1.00/1M) to Groq Llama 3.1 8B ($0.05/1M) as the default clustering engine.** This provides a 20x cost reduction with acceptable quality for real-time clustering. Keep Claude Haiku as a fallback for quality-critical scenarios. Use Google Gemini's free tier for development and low-volume production.

For a bootstrapped product like Query, the free tiers alone (Groq + Gemini + Mistral) could handle thousands of sessions per month at zero cost.

---

## Sources

- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [Anthropic Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Groq Pricing](https://groq.com/pricing)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Mistral AI Pricing](https://mistral.ai/pricing)
- [Cohere Pricing](https://cohere.com/pricing)
- [Meta Llama Models](https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/)
- [Microsoft Phi Models](https://azure.microsoft.com/en-us/products/phi/)
- [Qwen 2.5](https://qwenlm.github.io/blog/qwen2.5/)
- [Google Gemma 2](https://ai.google.dev/gemma)
- [Mistral Mixtral](https://mistral.ai/news/mixtral-of-experts)
- [Artificial Analysis LLM Comparison](https://artificialanalysis.ai/models)
