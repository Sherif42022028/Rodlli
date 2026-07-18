'use server'

import { ChatbotEngine } from '@/lib/chatbot/engine'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function getMerchantBySlug(slug: string) {
  try {
    const result = await db.execute(
      sql`SELECT id, profile_id, business_name, business_category, short_description, store_address, business_phone, website_url, slug, chatbot_link, bot_avatar_url FROM merchants WHERE slug = ${slug}`
    )
    const rows = result.rows as unknown as any[]
    if (rows && rows.length > 0) {
      return rows[0]
    }
    return null
  } catch (error) {
    console.error('getMerchantBySlug error:', error)
    return null
  }
}

export async function queryChatbot(message: string, merchantId: string, language: 'en' | 'ar' = 'en', conversationId?: string | null) {
  if (!message || !merchantId) {
    return { error: 'Missing required parameters' }
  }

  try {
    const engine = new ChatbotEngine(merchantId)
    const response = await engine.processMessage(message, language, conversationId)
    return { response }
  } catch (error: any) {
    console.error('queryChatbot error:', error)
    return { error: error.message || 'Failed to query chatbot' }
  }
}
export type { ChatbotEngine }
