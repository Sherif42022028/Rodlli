'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { extractSpreadsheetId, syncMerchantSheet, syncMerchantOrders } from '@/lib/google-sheets'

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
  const { businessName, businessCategory, categoryId, shortDescription, storeAddress, businessPhone, websiteUrl, botAvatarUrl, onboardingStep } = data

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
                category_id = ${categoryId || null},
                short_description = ${shortDescription || null}, 
                store_address = ${storeAddress || null}, 
                business_phone = ${businessPhone || null}, 
                website_url = ${websiteUrl || null}, 
                bot_avatar_url = ${botAvatarUrl || null}, 
                slug = ${slug}, 
                chatbot_link = ${chatbotLink},
                onboarding_step = ${onboardingStep !== undefined ? onboardingStep : existing.onboarding_step},
                updated_at = NOW()
            WHERE profile_id = ${profileId}`
      )
      return { success: true, slug }
    } else {
      // Insert
      await db.execute(
        sql`INSERT INTO merchants (profile_id, business_name, business_category, category_id, short_description, store_address, business_phone, website_url, slug, chatbot_link, bot_avatar_url, onboarding_step)
            VALUES (${profileId}, ${businessName}, ${businessCategory}, ${categoryId || null}, ${shortDescription || null}, ${storeAddress || null}, ${businessPhone || null}, ${websiteUrl || null}, ${slug}, ${chatbotLink}, ${botAvatarUrl || null}, ${onboardingStep || 1})`
      )
      return { success: true, slug }
    }
  } catch (error: any) {
    console.error('upsertMerchant error:', error)
    return { error: error.message || 'Failed to save business details' }
  }
}

// 2.5 Update Onboarding Step
export async function updateOnboardingStep(merchantId: string, step: number) {
  try {
    await db.execute(
      sql`UPDATE merchants SET onboarding_step = ${step}, updated_at = NOW() WHERE id = ${merchantId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('updateOnboardingStep error:', error)
    return { error: error.message || 'Failed to update onboarding step' }
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

export async function deleteProductsBulk(productIds: string[], merchantId: string) {
  if (!productIds || productIds.length === 0) {
    return { error: 'No products selected' }
  }
  try {
    for (const pId of productIds) {
      await db.execute(
        sql`DELETE FROM products WHERE id = ${pId} AND merchant_id = ${merchantId}`
      )
    }
    return { success: true, count: productIds.length }
  } catch (error: any) {
    console.error('deleteProductsBulk error:', error)
    return { error: error.message || 'Failed to delete selected products' }
  }
}

export async function deleteAllMerchantProducts(merchantId: string) {
  try {
    await db.execute(
      sql`DELETE FROM products WHERE merchant_id = ${merchantId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('deleteAllMerchantProducts error:', error)
    return { error: error.message || 'Failed to delete all products' }
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

// 7. Google Sheets Sync Actions

export async function saveMerchantSheetLink(merchantId: string, sheetUrlOrId: string) {
  try {
    const spreadsheetId = extractSpreadsheetId(sheetUrlOrId)
    if (!spreadsheetId) {
      return { error: 'رابط أو معرّف Google Sheet غير صحيح. يرجى التأكد من اختيار رابط صفحة الشيت الحقيقي.' }
    }

    await db.execute(
      sql`UPDATE merchants 
          SET google_sheet_id = ${spreadsheetId}, 
              sheet_sync_enabled = true,
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )

    // Trigger immediate first sync
    const syncResult = await syncMerchantSheet(merchantId)
    if (syncResult.error) {
      return { success: true, spreadsheetId, warning: syncResult.error }
    }

    return { success: true, spreadsheetId, count: syncResult.count }
  } catch (error: any) {
    console.error('saveMerchantSheetLink error:', error)
    return { error: error.message || 'فشل حفظ رابط الشيت' }
  }
}

export async function triggerManualSheetSync(merchantId: string) {
  try {
    const result = await syncMerchantSheet(merchantId)
    if (result.error) {
      return { error: result.error }
    }
    return { success: true, count: result.count }
  } catch (error: any) {
    console.error('triggerManualSheetSync error:', error)
    return { error: error.message || 'فشل تشغيل المزامنة' }
  }
}

export async function disconnectMerchantSheet(merchantId: string) {
  try {
    await db.execute(
      sql`UPDATE merchants 
          SET google_sheet_id = NULL, 
              google_refresh_token = NULL, 
              sheet_sync_enabled = false, 
              last_synced_at = NULL, 
              last_sync_status = NULL, 
              last_sync_error = NULL,
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('disconnectMerchantSheet error:', error)
    return { error: error.message || 'فشل إلغاء ربط الشيت' }
  }
}

// 7. Orders Google Sheets Actions
export async function saveMerchantOrdersSheetLink(merchantId: string, sheetUrlOrId: string) {
  try {
    const spreadsheetId = extractSpreadsheetId(sheetUrlOrId)
    if (!spreadsheetId) {
      return { error: 'رابط أو ID غير صحيح لشيت جوجل الخاص بالأوردرات' }
    }

    await db.execute(
      sql`UPDATE merchants 
          SET orders_sheet_id = ${spreadsheetId}, 
              orders_sync_enabled = true, 
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )

    const syncResult = await syncMerchantOrders(merchantId)
    if (syncResult.error) {
      return { success: true, spreadsheetId, warning: syncResult.error }
    }

    return { success: true, spreadsheetId, count: syncResult.count }
  } catch (error: any) {
    console.error('saveMerchantOrdersSheetLink error:', error)
    return { error: error.message || 'فشل حفظ رابط شيت الأوردرات' }
  }
}

export async function triggerManualOrdersSync(merchantId: string) {
  try {
    const result = await syncMerchantOrders(merchantId)
    if (result.error) {
      return { error: result.error }
    }
    return { success: true, count: result.count }
  } catch (error: any) {
    console.error('triggerManualOrdersSync error:', error)
    return { error: error.message || 'فشل تشغيل مزامنة الأوردرات' }
  }
}

export async function disconnectMerchantOrdersSheet(merchantId: string) {
  try {
    await db.execute(
      sql`UPDATE merchants 
          SET orders_sheet_id = NULL, 
              orders_sync_enabled = false, 
              orders_last_synced_at = NULL, 
              orders_last_sync_status = NULL, 
              orders_last_sync_error = NULL,
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )
    return { success: true }
  } catch (error: any) {
    console.error('disconnectMerchantOrdersSheet error:', error)
    return { error: error.message || 'فشل إلغاء ربط شيت الأوردرات' }
  }
}

export async function getMerchantOrders(merchantId: string) {
  try {
    const result = await db.execute(
      sql`SELECT id, order_id_external, customer_name, product_name, status, expected_date, notes, last_synced_at 
          FROM orders 
          WHERE merchant_id = ${merchantId} 
          ORDER BY last_synced_at DESC 
          LIMIT 50`
    )
    return (result.rows as unknown as any[]) || []
  } catch (error: any) {
    console.error('getMerchantOrders error:', error)
    return []
  }
}

export async function updateMerchantWidgetColor(merchantId: string, color: string) {
  try {
    const cleanColor = color && color.trim() ? color.trim() : '#F26B1D'
    await db.execute(
      sql`UPDATE merchants 
          SET widget_primary_color = ${cleanColor}, 
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )
    return { success: true, color: cleanColor }
  } catch (error: any) {
    console.error('updateMerchantWidgetColor error:', error)
    return { error: error.message || 'فشل حفظ لون الـ Widget' }
  }
}



