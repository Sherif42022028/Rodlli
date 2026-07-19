'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { INTEREST_WEIGHTS } from '@/lib/constants'

// 1. Get Categories with dynamic store counts
export async function getCategories() {
  try {
    const result = await db.execute(
      sql`SELECT c.id, c.name_en, c.name_ar, c.icon, c.display_order,
                 (SELECT COUNT(*)::integer FROM merchants m WHERE m.category_id = c.id AND m.is_active = true) as store_count
          FROM categories c
          ORDER BY c.display_order ASC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getCategories error:', error)
    return []
  }
}

// 2. Search / filter stores
export async function getStores(categoryId?: string, searchQuery?: string) {
  try {
    let query = sql`
      SELECT m.id, m.business_name, m.business_category, m.short_description, m.store_address, 
             m.business_phone, m.website_url, m.slug, m.bot_avatar_url, m.is_online,
             c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM merchants m
      LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.is_active = true
    `

    if (categoryId) {
      query = sql`${query} AND m.category_id = ${categoryId}`
    }

    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`
      query = sql`${query} AND (m.business_name ILIKE ${searchPattern} OR m.short_description ILIKE ${searchPattern})`
    }

    query = sql`${query} ORDER BY m.created_at DESC`

    const result = await db.execute(query)
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getStores error:', error)
    return []
  }
}

// 3. Trending Stores (Returns top 5 active stores)
export async function getTrendingStores() {
  try {
    const result = await db.execute(
      sql`SELECT m.id, m.business_name, m.business_category, m.short_description, m.slug, m.bot_avatar_url, m.is_online,
                 c.name_en as category_name_en, c.name_ar as category_name_ar
          FROM merchants m
          LEFT JOIN categories c ON c.id = m.category_id
          WHERE m.is_active = true
          ORDER BY m.created_at DESC
          LIMIT 5`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getTrendingStores error:', error)
    return []
  }
}

// 4. Get or Create conversation
export async function getOrCreateConversation(
  merchantId: string, 
  buyerId?: string | null, 
  guestSessionId?: string | null
) {
  try {
    let result;
    if (buyerId) {
      // Find existing
      result = await db.execute(
        sql`SELECT id FROM conversations WHERE merchant_id = ${merchantId} AND buyer_id = ${buyerId} LIMIT 1`
      )
    } else if (guestSessionId) {
      // Find existing guest
      result = await db.execute(
        sql`SELECT id FROM conversations WHERE merchant_id = ${merchantId} AND buyer_session_id = ${guestSessionId} LIMIT 1`
      )
    }

    const rows = result?.rows as unknown as any[]
    if (rows && rows.length > 0) {
      return rows[0].id as string
    }

    // Create new conversation
    let insertQuery;
    if (buyerId) {
      insertQuery = sql`
        INSERT INTO conversations (merchant_id, buyer_id)
        VALUES (${merchantId}, ${buyerId})
        RETURNING id
      `
    } else {
      insertQuery = sql`
        INSERT INTO conversations (merchant_id, buyer_session_id)
        VALUES (${merchantId}, ${guestSessionId})
        RETURNING id
      `
    }

    const insertResult = await db.execute(insertQuery)
    const insertRows = insertResult.rows as unknown as any[]
    if (insertRows && insertRows.length > 0) {
      return insertRows[0].id as string
    }
    throw new Error('Failed to insert conversation')
  } catch (error) {
    console.error('getOrCreateConversation error:', error)
    return null
  }
}

// 5. Get message history
export async function getChatHistory(conversationId: string) {
  try {
    const result = await db.execute(
      sql`SELECT id, sender_type as sender, content as text, created_at 
          FROM messages 
          WHERE conversation_id = ${conversationId} 
          ORDER BY created_at ASC`
    )
    // Map sender_type 'bot' to 'bot', 'buyer'/'merchant' to 'user'
    return (result.rows as unknown as any[]).map(m => ({
      id: m.id as string,
      sender: (m.sender === 'bot' ? 'bot' : 'user') as 'bot' | 'user',
      text: m.text as string
    }))
  } catch (error) {
    console.error('getChatHistory error:', error)
    return []
  }
}

// 6. Save chat message
export async function saveChatMessage(
  conversationId: string, 
  sender: 'bot' | 'buyer' | 'merchant', 
  content: string,
  isConfident: boolean = true
) {
  try {
    await db.execute(
      sql`INSERT INTO messages (conversation_id, sender_type, content, is_confident)
          VALUES (${conversationId}, ${sender}, ${content}, ${isConfident})`
    )
    return { success: true }
  } catch (error: any) {
    console.error('saveChatMessage error:', error)
    return { error: error.message || 'Failed to save message' }
  }
}

// 7. Get Buyer's active conversations list
export async function getBuyerConversations(buyerId: string) {
  try {
    const result = await db.execute(
      sql`SELECT c.id, c.started_at, m.business_name, m.slug, m.bot_avatar_url,
                 (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                 (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
          FROM conversations c
          JOIN merchants m ON m.id = c.merchant_id
          WHERE c.buyer_id = ${buyerId}
          ORDER BY c.started_at DESC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getBuyerConversations error:', error)
    return []
  }
}

// 8. Create Contact Request
export async function createContactRequest(merchantId: string, conversationId: string) {
  try {
    await db.execute(
      sql`INSERT INTO contact_requests (merchant_id, conversation_id)
          VALUES (${merchantId}, ${conversationId})`
    )
    return { success: true }
  } catch (error: any) {
    console.error('createContactRequest error:', error)
    return { error: error.message || 'Failed to create contact request' }
  }
}



// 9. Increment Buyer Interest score
export async function incrementInterest(buyerId: string | null | undefined, categoryId: string | null | undefined, weight: number) {
  if (!buyerId || !categoryId) return { success: false }
  try {
    await db.execute(
      sql`INSERT INTO buyer_interests (buyer_id, category_id, score)
          VALUES (${buyerId}, ${categoryId}, ${weight})
          ON CONFLICT (buyer_id, category_id)
          DO UPDATE SET 
            score = LEAST(${INTEREST_WEIGHTS.MAX_SCORE_PER_CATEGORY}, buyer_interests.score + ${weight}),
            updated_at = NOW()`
    )
    return { success: true }
  } catch (error) {
    console.error('incrementInterest error:', error)
    return { error: 'Failed to increment buyer interest' }
  }
}

// 10. Save multiple buyer interests at signup
export async function saveBuyerSignupInterests(buyerId: string, categoryIds: string[]) {
  if (!buyerId || !categoryIds || categoryIds.length === 0) return { success: true }
  try {
    for (const catId of categoryIds) {
      await db.execute(
        sql`INSERT INTO buyer_interests (buyer_id, category_id, score)
            VALUES (${buyerId}, ${catId}, ${INTEREST_WEIGHTS.SIGNUP_SELECTION})
            ON CONFLICT (buyer_id, category_id)
            DO UPDATE SET 
              score = LEAST(${INTEREST_WEIGHTS.MAX_SCORE_PER_CATEGORY}, buyer_interests.score + ${INTEREST_WEIGHTS.SIGNUP_SELECTION}),
              updated_at = NOW()`
      )
    }
    return { success: true }
  } catch (error) {
    console.error('saveBuyerSignupInterests error:', error)
    return { error: 'Failed to save signup interests' }
  }
}

// 11. Get Recommended Stores based on Buyer Interest score
export async function getRecommendedStores(buyerId: string | null | undefined, limit: number = 6) {
  if (!buyerId) return []
  try {
    const result = await db.execute(
      sql`SELECT m.id, m.business_name, m.business_category, m.short_description, m.slug, m.bot_avatar_url, m.is_online,
                 c.name_en as category_name_en, c.name_ar as category_name_ar, bi.score
          FROM merchants m
          JOIN buyer_interests bi ON bi.category_id = m.category_id
          LEFT JOIN categories c ON c.id = m.category_id
          WHERE bi.buyer_id = ${buyerId} 
            AND m.is_active = true 
            AND bi.score > 0
          ORDER BY bi.score DESC, m.created_at DESC
          LIMIT ${limit}`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getRecommendedStores error:', error)
    return []
  }
}
