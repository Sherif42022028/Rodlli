import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { generateText, stepCountIs } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export interface NormalizedLLMResponse {
  text: string
  confident: boolean
  provider: 'groq' | 'glm' | 'gemini' | 'local'
  modelUsed: string
  latencyMs: number
  fallbackOccurred: boolean
  fallbackReason?: string
}

export interface LLMRouterOptions {
  merchantId: string
  conversationId?: string | null
  systemInstruction: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  tools: Record<string, any>
  timeoutMs?: number
}

function withTimeout<T>(promise: Promise<T>, ms: number, providerName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Provider ${providerName} request timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function logProviderExecution(
  merchantId: string,
  conversationId: string | null | undefined,
  provider: string,
  model: string,
  latencyMs: number,
  status: 'success' | 'fallback' | 'error',
  errorReason?: string
) {
  try {
    const convUUID = conversationId || null
    await db.execute(
      sql`INSERT INTO provider_logs (merchant_id, conversation_id, provider, model, latency_ms, status, error_reason)
          VALUES (${merchantId}, ${convUUID}, ${provider}, ${model}, ${latencyMs}, ${status}, ${errorReason || null})`
    )
  } catch (e) {
    console.error('logProviderExecution error:', e)
  }
}

function parseModelOutput(rawText: string): { reply: string; confident: boolean } {
  const trimmed = rawText.trim()
  let parsed: any = { reply: trimmed, confident: true }
  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    }
  } catch {
    parsed = { reply: trimmed, confident: true }
  }

  return {
    reply: parsed.reply || trimmed,
    confident: parsed.confident !== false
  }
}

async function callGroqAdapter(options: LLMRouterOptions): Promise<{ text: string; confident: boolean; modelUsed: string }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const groq = createOpenAICompatible({
    name: 'groq',
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1'
  })

  const result = await generateText({
    model: groq(modelName),
    system: options.systemInstruction,
    messages: options.messages,
    tools: options.tools,
    stopWhen: stepCountIs(3)
  })

  const parsed = parseModelOutput(result.text)
  return {
    text: parsed.reply,
    confident: parsed.confident,
    modelUsed: modelName
  }
}

async function callGLMAdapter(options: LLMRouterOptions): Promise<{ text: string; confident: boolean; modelUsed: string }> {
  const apiKey = process.env.ZHIPU_API_KEY || process.env.GLM_API_KEY
  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY / GLM_API_KEY is not configured')
  }

  const modelName = process.env.ZHIPU_MODEL || 'glm-4.7-flash'
  const zhipu = createOpenAICompatible({
    name: 'zhipu',
    apiKey,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4'
  })

  const result = await generateText({
    model: zhipu(modelName),
    system: options.systemInstruction,
    messages: options.messages,
    tools: options.tools,
    stopWhen: stepCountIs(3)
  })

  const parsed = parseModelOutput(result.text)
  return {
    text: parsed.reply,
    confident: parsed.confident,
    modelUsed: modelName
  }
}

export class LLMRouter {
  /**
   * Route user query through primary LLM (Groq) with automatic fallback to secondary LLM (GLM-4.7-flash).
   */
  static async generateLLMReply(options: LLMRouterOptions): Promise<NormalizedLLMResponse> {
    const timeoutMs = options.timeoutMs || parseInt(process.env.GROQ_TIMEOUT_MS || '7000', 10)
    const useGroqPrimary = process.env.USE_GROQ_PRIMARY !== 'false' && Boolean(process.env.GROQ_API_KEY)
    let fallbackOccurred = false
    let fallbackReason: string | undefined

    // 1. Primary Attempt: Groq
    if (useGroqPrimary) {
      const groqStart = Date.now()
      try {
        const res = await withTimeout(callGroqAdapter(options), timeoutMs, 'groq')
        const latencyMs = Date.now() - groqStart

        await logProviderExecution(
          options.merchantId,
          options.conversationId,
          'groq',
          res.modelUsed,
          latencyMs,
          'success'
        )

        return {
          text: res.text,
          confident: res.confident,
          provider: 'groq',
          modelUsed: res.modelUsed,
          latencyMs,
          fallbackOccurred: false
        }
      } catch (err: any) {
        const latencyMs = Date.now() - groqStart
        fallbackOccurred = true
        fallbackReason = err?.message || 'Groq request failed'
        console.warn(`[LLMRouter] Groq primary provider failed (${latencyMs}ms): ${fallbackReason}. Falling back to GLM-4.7-flash...`)

        await logProviderExecution(
          options.merchantId,
          options.conversationId,
          'groq',
          process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          latencyMs,
          'fallback',
          fallbackReason
        )
      }
    }

    // 2. Fallback Attempt: GLM-4.7-flash (Zhipu AI)
    const glmStart = Date.now()
    try {
      const res = await callGLMAdapter(options)
      const latencyMs = Date.now() - glmStart

      await logProviderExecution(
        options.merchantId,
        options.conversationId,
        'glm',
        res.modelUsed,
        latencyMs,
        'success'
      )

      return {
        text: res.text,
        confident: res.confident,
        provider: 'glm',
        modelUsed: res.modelUsed,
        latencyMs,
        fallbackOccurred,
        fallbackReason
      }
    } catch (err: any) {
      const latencyMs = Date.now() - glmStart
      const errorReason = err?.message || 'GLM provider failed'
      console.error(`[LLMRouter] GLM fallback provider failed (${latencyMs}ms): ${errorReason}`)

      await logProviderExecution(
        options.merchantId,
        options.conversationId,
        'glm',
        process.env.ZHIPU_MODEL || 'glm-4.7-flash',
        latencyMs,
        'error',
        errorReason
      )

      throw new Error(`All LLM providers failed. Primary reason: ${fallbackReason || 'Skipped'}. Fallback reason: ${errorReason}`)
    }
  }
}
