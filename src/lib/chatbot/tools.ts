import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// 1. Search products
export async function searchProducts(query: string, merchantId: string) {
  try {
    const cleanQuery = (query || '').trim().toLowerCase()
    
    // Check if query is generic/broad (e.g. asking for all products, catalog, menu, items)
    const isGenericQuery = !cleanQuery || 
      cleanQuery === 'menu' || 
      cleanQuery === 'all' || 
      cleanQuery === '*' ||
      /^(منتجات|المنتجات|منيو|المنيو|كتالوج|الكتالوج|كل|عرض|أصناف|الاصناف|بضاعة|البضاعة|عايز|عندكم|موجود|products|catalog|menu|all|show|list)$/i.test(cleanQuery) ||
      cleanQuery.includes('ما هي المنتجات') ||
      cleanQuery.includes('الموجودة') ||
      cleanQuery.includes('عندكم ايه')

    if (!isGenericQuery) {
      const searchPattern = `%${cleanQuery}%`
      const result = await db.execute(
        sql`SELECT id, name, price, description, image_urls, colors, sizes, category_name, product_type, in_stock, availability, extra_attributes 
            FROM products 
            WHERE merchant_id = ${merchantId} AND is_active = true 
              AND (
                name ILIKE ${searchPattern} 
                OR description ILIKE ${searchPattern} 
                OR colors ILIKE ${searchPattern} 
                OR sizes ILIKE ${searchPattern}
                OR category_name ILIKE ${searchPattern}
                OR extra_attributes::text ILIKE ${searchPattern}
              )
            LIMIT 10`
      )
      const rows = result.rows as unknown as any[]
      if (rows && rows.length > 0) {
        return rows
      }
    }

    // Fallback: If specific search string returned 0 items OR if it's a broad catalog query, return active catalog items
    const allResult = await db.execute(
      sql`SELECT id, name, price, description, image_urls, colors, sizes, category_name, product_type, in_stock, availability, extra_attributes 
          FROM products 
          WHERE merchant_id = ${merchantId} AND is_active = true 
          ORDER BY created_at DESC 
          LIMIT 10`
    )
    return allResult.rows as unknown as any[]
  } catch (error) {
    console.error('searchProducts tool error:', error)
    return []
  }
}

// 2. Get product details
export async function getProductDetails(productId: string) {
  try {
    const result = await db.execute(
      sql`SELECT id, name, price, description, image_urls, colors, sizes, category_name, product_type, in_stock, availability, extra_attributes FROM products WHERE id = ${productId} LIMIT 1`
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
    const cleanTopic = (topic || '').trim().toLowerCase()
    if (!cleanTopic) {
      const allFaqs = await db.execute(
        sql`SELECT question, answer FROM faqs WHERE merchant_id = ${merchantId} LIMIT 10`
      )
      return allFaqs.rows as unknown as any[]
    }

    const searchPattern = `%${cleanTopic}%`
    const result = await db.execute(
      sql`SELECT question, answer 
          FROM faqs 
          WHERE merchant_id = ${merchantId} 
            AND (question ILIKE ${searchPattern} OR answer ILIKE ${searchPattern})
          LIMIT 5`
    )
    const rows = result.rows as unknown as any[]
    if (rows && rows.length > 0) {
      return rows
    }

    // Fallback: If specific topic search yielded 0 rows, return store FAQs for AI reasoning
    const fallbackFaqs = await db.execute(
      sql`SELECT question, answer FROM faqs WHERE merchant_id = ${merchantId} LIMIT 10`
    )
    return fallbackFaqs.rows as unknown as any[]
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

// 5. Check order status
export async function checkOrderStatus(orderId: string, merchantId: string) {
  try {
    const cleanOrderId = orderId.trim().replace(/^#/, '')
    const searchPattern = `%${cleanOrderId}%`
    
    const result = await db.execute(
      sql`SELECT order_id_external, customer_name, product_name, status, expected_date, notes, last_synced_at
          FROM orders
          WHERE merchant_id = ${merchantId}
            AND (order_id_external ILIKE ${cleanOrderId} OR order_id_external ILIKE ${searchPattern})
          LIMIT 1`
    )
    const rows = result.rows as unknown as any[]
    if (rows && rows.length > 0) {
      const ord = rows[0]
      let statusAr = 'قيد التجهيز ⏳'
      let statusEn = 'Pending ⏳'
      if (ord.status === 'SHIPPED') {
        statusAr = 'في الطريق 🚚'
        statusEn = 'Shipped / In Transit 🚚'
      } else if (ord.status === 'DELIVERED') {
        statusAr = 'تم التسليم ✅'
        statusEn = 'Delivered ✅'
      } else if (ord.status === 'CANCELLED') {
        statusAr = 'ملغي ❌'
        statusEn = 'Cancelled ❌'
      } else {
        statusAr = 'قيد التجهيز ⏳'
        statusEn = 'Pending ⏳'
      }

      return {
        found: true,
        orderId: ord.order_id_external,
        customerName: ord.customer_name,
        productName: ord.product_name,
        status: ord.status,
        statusAr,
        statusEn,
        expectedDate: ord.expected_date,
        notes: ord.notes
      }
    }

    return { found: false, orderId: cleanOrderId }
  } catch (error) {
    console.error('checkOrderStatus tool error:', error)
    return { found: false, orderId }
  }
}
