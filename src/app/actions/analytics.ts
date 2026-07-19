'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// 1. Snapshot Overview Metrics
export async function getAnalyticsOverview(merchantId: string) {
  try {
    // Today's Conversations Count
    const conversationsResult = await db.execute(
      sql`SELECT COUNT(*)::integer as count 
          FROM conversations 
          WHERE merchant_id = ${merchantId} 
            AND created_at >= CURRENT_DATE`
    )
    const conversationsToday = (conversationsResult.rows[0] as any)?.count || 0

    // Today's Messages Count
    const messagesResult = await db.execute(
      sql`SELECT COUNT(*)::integer as count 
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE c.merchant_id = ${merchantId} 
            AND m.created_at >= CURRENT_DATE`
    )
    const messagesToday = (messagesResult.rows[0] as any)?.count || 0

    // Today's AI Response Rate (confident: true bot responses / total bot responses)
    const responseRateResult = await db.execute(
      sql`SELECT 
            COUNT(*) FILTER (WHERE is_confident = true)::integer as confident_count,
            COUNT(*)::integer as total_count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE c.merchant_id = ${merchantId} 
            AND m.sender_type = 'bot' 
            AND m.created_at >= CURRENT_DATE`
    )
    const confidentCount = (responseRateResult.rows[0] as any)?.confident_count || 0
    const totalBotCount = (responseRateResult.rows[0] as any)?.total_count || 0
    const responseRate = totalBotCount === 0 ? 1.0 : confidentCount / totalBotCount

    // Unanswered Questions Count (Pending / unresolved)
    const unansweredResult = await db.execute(
      sql`SELECT COUNT(*)::integer as count 
          FROM unanswered_questions 
          WHERE merchant_id = ${merchantId} 
            AND is_resolved = false`
    )
    const unansweredCount = (unansweredResult.rows[0] as any)?.count || 0

    return {
      conversationsToday,
      messagesToday,
      responseRate,
      unansweredCount
    }
  } catch (error) {
    console.error('getAnalyticsOverview error:', error)
    return {
      conversationsToday: 0,
      messagesToday: 0,
      responseRate: 1.0,
      unansweredCount: 0
    }
  }
}

// 2. Daily Conversations Trend (7d or 30d)
export async function getAnalyticsTrend(merchantId: string, range: '7d' | '30d') {
  try {
    const daysLimit = range === '30d' ? 30 : 7
    const result = await db.execute(
      sql`SELECT 
            TO_CHAR(c.created_at, 'YYYY-MM-DD') as date_str, 
            COUNT(*)::integer as conversations
          FROM conversations c
          WHERE c.merchant_id = ${merchantId} 
            AND c.created_at >= NOW() - (INTERVAL '1 day' * ${daysLimit})
          GROUP BY TO_CHAR(c.created_at, 'YYYY-MM-DD')
          ORDER BY date_str ASC`
    )

    const rows = result.rows as unknown as Array<{ date_str: string; conversations: number }>
    const dataMap = new Map(rows.map(r => [r.date_str, r.conversations]))

    // Generate consecutive dates to fill in the gaps with 0
    const trendData: Array<{ date: string; conversations: number }> = []
    for (let i = daysLimit - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10) // YYYY-MM-DD
      
      // Formatting date label for display
      const displayLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      
      trendData.push({
        date: displayLabel,
        conversations: dataMap.get(dateStr) || 0
      })
    }

    return trendData
  } catch (error) {
    console.error('getAnalyticsTrend error:', error)
    return []
  }
}

// 3. Top Products Asked About
export async function getTopProducts(merchantId: string, limit: number = 5) {
  try {
    const result = await db.execute(
      sql`SELECT 
            p.name as name,
            COUNT(t.id)::integer as count
          FROM tool_call_logs t
          JOIN products p ON t.matched_product_id = p.id
          WHERE t.merchant_id = ${merchantId} 
            AND (t.tool_name = 'searchProducts' OR t.tool_name = 'getProductDetails')
          GROUP BY p.id, p.name
          ORDER BY count DESC
          LIMIT ${limit}`
    )
    return result.rows as unknown as Array<{ name: string; count: number }>
  } catch (error) {
    console.error('getTopProducts error:', error)
    return []
  }
}

// 4. Top FAQ Questions Asked
export async function getTopQuestions(merchantId: string, limit: number = 5) {
  try {
    const result = await db.execute(
      sql`SELECT 
            LOWER(TRIM(tool_input->>'topic')) as question,
            COUNT(*)::integer as count
          FROM tool_call_logs
          WHERE merchant_id = ${merchantId} 
            AND tool_name = 'getFAQAnswer'
            AND tool_input->>'topic' IS NOT NULL
            AND TRIM(tool_input->>'topic') <> ''
          GROUP BY question
          ORDER BY count DESC
          LIMIT ${limit}`
    )
    return result.rows as unknown as Array<{ question: string; count: number }>
  } catch (error) {
    console.error('getTopQuestions error:', error)
    return []
  }
}

// 5. Contact Request Conversion Rate
export async function getConversionRate(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT 
            (SELECT COUNT(*)::float FROM contact_requests WHERE merchant_id = ${merchantId}) as contacts,
            (SELECT COUNT(*)::float FROM conversations WHERE merchant_id = ${merchantId}) as total_convs`
    )
    
    const row = result.rows[0] as any
    const contacts = row?.contacts || 0
    const totalConvs = row?.total_convs || 0
    
    const conversionRate = totalConvs === 0 ? 0.0 : contacts / totalConvs
    return {
      contacts,
      totalConvs,
      conversionRate
    }
  } catch (error) {
    console.error('getConversionRate error:', error)
    return {
      contacts: 0,
      totalConvs: 0,
      conversionRate: 0.0
    }
  }
}
