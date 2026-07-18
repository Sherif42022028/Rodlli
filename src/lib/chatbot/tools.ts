import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// 1. Search products
export async function searchProducts(query: string, merchantId: string) {
  try {
    const searchPattern = `%${query}%`
    const result = await db.execute(
      sql`SELECT id, name, price, description, image_urls 
          FROM products 
          WHERE merchant_id = ${merchantId} AND is_active = true 
            AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
          LIMIT 5`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('searchProducts tool error:', error)
    return []
  }
}

// 2. Get product details
export async function getProductDetails(productId: string) {
  try {
    const result = await db.execute(
      sql`SELECT id, name, price, description, image_urls FROM products WHERE id = ${productId} LIMIT 1`
    )
    const rows = result.rows as unknown as any[]
    if (rows && rows.length > 0) {
      return rows[0]
    }
    return null
  } catch (error) {
    console.error('getProductDetails tool error:', error)
    return null
  }
}

// 3. Search FAQs
export async function getFAQAnswer(topic: string, merchantId: string) {
  try {
    const searchPattern = `%${topic}%`
    const result = await db.execute(
      sql`SELECT question, answer 
          FROM faqs 
          WHERE merchant_id = ${merchantId} 
            AND (question ILIKE ${searchPattern} OR answer ILIKE ${searchPattern})
          LIMIT 3`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getFAQAnswer tool error:', error)
    return []
  }
}

// 4. Check working hours
export async function checkWorkingHours(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT day_of_week, open_time, close_time, is_closed 
          FROM working_hours 
          WHERE merchant_id = ${merchantId} 
          ORDER BY day_of_week ASC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('checkWorkingHours tool error:', error)
    return []
  }
}
