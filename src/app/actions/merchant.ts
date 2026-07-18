'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// 1. Get Merchant profile
export async function getMerchantByProfileId(profileId: string) {
  try {
    const result = await db.execute(
      sql`SELECT * FROM merchants WHERE profile_id = ${profileId}`
    )
    const rows = result.rows as unknown as any[]
    if (rows && rows.length > 0) {
      return rows[0]
    }
    return null
  } catch (error) {
    console.error('getMerchantByProfileId error:', error)
    return null
  }
}

// 2. Upsert Merchant (Onboarding Step 1)
export async function upsertMerchant(data: Record<string, any>, profileId: string) {
  const { businessName, businessCategory, shortDescription, storeAddress, businessPhone, websiteUrl, botAvatarUrl } = data

  if (!businessName || !businessCategory) {
    return { error: 'Business name and category are required' }
  }

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const chatbotLink = `/chat/${slug}`

  try {
    // Check if merchant already exists
    const existing = await getMerchantByProfileId(profileId)

    if (existing) {
      // Update
      await db.execute(
        sql`UPDATE merchants 
            SET business_name = ${businessName}, 
                business_category = ${businessCategory}, 
                short_description = ${shortDescription || null}, 
                store_address = ${storeAddress || null}, 
                business_phone = ${businessPhone || null}, 
                website_url = ${websiteUrl || null}, 
                bot_avatar_url = ${botAvatarUrl || null}, 
                slug = ${slug}, 
                chatbot_link = ${chatbotLink},
                updated_at = NOW()
            WHERE profile_id = ${profileId}`
      )
      return { success: true, slug }
    } else {
      // Insert
      await db.execute(
        sql`INSERT INTO merchants (profile_id, business_name, business_category, short_description, store_address, business_phone, website_url, slug, chatbot_link, bot_avatar_url)
            VALUES (${profileId}, ${businessName}, ${businessCategory}, ${shortDescription || null}, ${storeAddress || null}, ${businessPhone || null}, ${websiteUrl || null}, ${slug}, ${chatbotLink}, ${botAvatarUrl || null})`
      )
      return { success: true, slug }
    }
  } catch (error: any) {
    console.error('upsertMerchant error:', error)
    return { error: error.message || 'Failed to save business details' }
  }
}

// 3. Products Operations
export async function getProducts(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT * FROM products WHERE merchant_id = ${merchantId} ORDER BY created_at DESC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getProducts error:', error)
    return []
  }
}

export async function addProduct(data: Record<string, any>, merchantId: string) {
  const { name, price, description, imageUrls } = data

  if (!name || price === undefined) {
    return { error: 'Product name and price are required' }
  }

  try {
    const imagesArray = imageUrls || []
    const arrayLiteral = '{' + imagesArray.map((img: string) => `"${img.replace(/"/g, '\\"')}"`).join(',') + '}'
    await db.execute(
      sql`INSERT INTO products (merchant_id, name, price, description, image_urls)
          VALUES (${merchantId}, ${name}, ${price}, ${description || null}, ${arrayLiteral})`
    )
    return { success: true }
  } catch (error: any) {
    console.error('addProduct error:', error)
    return { error: error.message || 'Failed to add product' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    await db.execute(
      sql`DELETE FROM products WHERE id = ${productId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('deleteProduct error:', error)
    return { error: error.message || 'Failed to delete product' }
  }
}

// 4. FAQs Operations
export async function getFAQs(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT * FROM faqs WHERE merchant_id = ${merchantId} ORDER BY order_index ASC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getFAQs error:', error)
    return []
  }
}

export async function addFAQ(data: Record<string, any>, merchantId: string) {
  const { question, answer, orderIndex } = data

  if (!question || !answer) {
    return { error: 'Question and answer are required' }
  }

  try {
    await db.execute(
      sql`INSERT INTO faqs (merchant_id, question, answer, order_index)
          VALUES (${merchantId}, ${question}, ${answer}, ${orderIndex || 0})`
    )
    return { success: true }
  } catch (error: any) {
    console.error('addFAQ error:', error)
    return { error: error.message || 'Failed to add FAQ' }
  }
}

export async function deleteFAQ(faqId: string) {
  try {
    await db.execute(
      sql`DELETE FROM faqs WHERE id = ${faqId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('deleteFAQ error:', error)
    return { error: error.message || 'Failed to delete FAQ' }
  }
}

// 5. Working Hours Operations
export async function getWorkingHours(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT * FROM working_hours WHERE merchant_id = ${merchantId} ORDER BY day_of_week ASC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getWorkingHours error:', error)
    return []
  }
}

export async function updateWorkingHours(merchantId: string, hours: Array<{ day_of_week: number, open_time: string, close_time: string, is_closed: boolean }>) {
  try {
    // Delete existing hours
    await db.execute(
      sql`DELETE FROM working_hours WHERE merchant_id = ${merchantId}`
    )

    // Insert new hours
    for (const h of hours) {
      await db.execute(
        sql`INSERT INTO working_hours (merchant_id, day_of_week, open_time, close_time, is_closed)
            VALUES (${merchantId}, ${h.day_of_week}, ${h.open_time || null}, ${h.close_time || null}, ${h.is_closed})`
      )
    }
    return { success: true }
  } catch (error: any) {
    console.error('updateWorkingHours error:', error)
    return { error: error.message || 'Failed to update working hours' }
  }
}

// 6. Unanswered Questions Operations
export async function getUnansweredQuestions(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT * FROM unanswered_questions 
          WHERE merchant_id = ${merchantId} AND is_resolved = false 
          ORDER BY created_at DESC`
    )
    return result.rows as unknown as any[]
  } catch (error) {
    console.error('getUnansweredQuestions error:', error)
    return []
  }
}

export async function resolveUnansweredQuestion(questionId: string) {
  try {
    await db.execute(
      sql`UPDATE unanswered_questions SET is_resolved = true WHERE id = ${questionId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('resolveUnansweredQuestion error:', error)
    return { error: error.message || 'Failed to resolve question' }
  }
}
