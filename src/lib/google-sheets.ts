import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { decryptToken } from '@/lib/encryption'
import { getCategoryTemplate } from '@/lib/constants/category-templates'

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_SHEETS_CLIENT_ID || '').trim()
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SHEETS_CLIENT_SECRET || '').trim()
const GOOGLE_REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google-sheets/callback').trim()

/**
 * Extracts spreadsheet ID from Google Sheet URL or raw ID string.
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null
  const trimmed = urlOrId.trim()
  
  // Match URL format: /d/{spreadsheetId}
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (match && match[1]) {
    return match[1]
  }

  // If already pure ID string (e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed
  }

  return null
}

/**
 * Builds Google OAuth 2.0 Auth URL for merchant agreement.
 */
export function getGoogleAuthUrl(stateParam: string, customRedirectUri?: string): string {
  const redirectUri = customRedirectUri || GOOGLE_REDIRECT_URI
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: stateParam
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchanges authorization code for tokens (access_token, refresh_token).
 */
export async function exchangeCodeForTokens(code: string, customRedirectUri?: string) {
  const redirectUri = customRedirectUri || GOOGLE_REDIRECT_URI
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code')
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_in: data.expires_in as number
  }
}

/**
 * Gets a fresh access_token using encrypted refresh_token stored in DB.
 */
export async function getAccessTokenFromRefreshToken(encryptedRefreshToken: string): Promise<string> {
  const refreshToken = decryptToken(encryptedRefreshToken)
  if (!refreshToken) {
    throw new Error('Refresh token is missing or invalid')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh access token')
  }

  return data.access_token as string
}

/**
 * Reads row values from Google Sheets API v4.
 */
export async function fetchSheetRows(spreadsheetId: string, accessToken: string, range = 'A1:Z1000'): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to fetch spreadsheet rows')
  }

  return (data.values as string[][]) || []
}

/**
 * Performs full product sync for a merchant from their linked Google Sheet.
 */
export async function syncMerchantSheet(merchantId: string) {
  try {
    // 1. Fetch merchant details including business_category
    const merchantRes = await db.execute(
      sql`SELECT id, google_sheet_id, google_refresh_token, sheet_sync_enabled, business_category FROM merchants WHERE id = ${merchantId}`
    )
    const merchantRows = merchantRes.rows as unknown as any[]
    if (!merchantRows || merchantRows.length === 0) {
      return { error: 'Merchant not found' }
    }

    const merchant = merchantRows[0]
    if (!merchant.google_sheet_id || !merchant.google_refresh_token) {
      return { error: 'Google Sheet is not connected' }
    }

    // Resolve Category Template
    const template = getCategoryTemplate(merchant.business_category)

    // 2. Get fresh Access Token
    let accessToken: string
    try {
      accessToken = await getAccessTokenFromRefreshToken(merchant.google_refresh_token)
    } catch (authError: any) {
      console.error(`Sync Auth Error for merchant ${merchantId}:`, authError)
      const errorMsg = 'انقطع الاتصال بـ Google Sheets، يرجى إعادة الربط وتجديد التصريح'
      await db.execute(
        sql`UPDATE merchants 
            SET last_sync_status = 'error', 
                last_sync_error = ${errorMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: errorMsg }
    }

    // 3. Fetch Sheet Rows (A1:Z1000)
    let rows: string[][] = []
    try {
      rows = await fetchSheetRows(merchant.google_sheet_id, accessToken, 'A1:Z1000')
    } catch (sheetError: any) {
      console.error(`Sync Sheet Fetch Error for merchant ${merchantId}:`, sheetError)
      const errorMsg = `فشل قراءة بيانات الشيت: ${sheetError.message || 'تأكد من وجود الشيت ومشاركته'}`
      await db.execute(
        sql`UPDATE merchants 
            SET last_sync_status = 'error', 
                last_sync_error = ${errorMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: errorMsg }
    }

    // 4. If rows are empty
    if (!rows || rows.length === 0) {
      const warningMsg = 'الشيت فارغ أو لا يحتوي على بيانات منتجات'
      await db.execute(
        sql`UPDATE merchants 
            SET last_sync_status = 'error', 
                last_sync_error = ${warningMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: warningMsg }
    }

    // 5. Parse and Validate Rows
    // Expected structure:
    // Col A (0): Name | Col B (1): Price | Col C (2): Description | Col D (3): Stock/Available or Availability | Col E (4): Image URL | Col F (5)+: Extra Fields (Category Template)
    const validProductsToSync: Array<{
      name: string
      price: number
      description: string
      inStock: boolean
      availability: string
      productType: string
      imageUrl: string
      colors: string
      sizes: string
      categoryName: string
      extraAttributes: Record<string, any>
    }> = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const rawName = row[0] ? String(row[0]).trim() : ''
      if (!rawName) continue // Skip blank name rows

      // Header row detection
      const lowerName = rawName.toLowerCase()
      if (
        i === 0 && (
          lowerName === 'اسم المنتج' || 
          lowerName === 'الاسم' || 
          lowerName === 'name' || 
          lowerName === 'product' || 
          lowerName === 'product name' ||
          lowerName.includes('اسم')
        )
      ) {
        continue // Skip header line
      }

      const rawPrice = row[1] ? String(row[1]).trim() : ''
      // Clean non-numeric except dot
      const cleanedPriceStr = rawPrice.replace(/[^0-9.]/g, '')
      let priceNum = parseFloat(cleanedPriceStr)
      if (isNaN(priceNum) || priceNum < 0) {
        priceNum = 0 // Fallback price 0 if unparseable
      }

      const description = row[2] ? String(row[2]).trim() : ''
      const rawAvailable = row[3] ? String(row[3]).trim() : ''
      
      let inStock = true
      let availability = ''

      if (template.productType === 'service') {
        inStock = true
        availability = rawAvailable
      } else {
        const lowerAvail = rawAvailable.toLowerCase()
        inStock = !(
          lowerAvail === 'لا' || 
          lowerAvail === 'no' || 
          lowerAvail === 'false' || 
          lowerAvail === '0' || 
          lowerAvail.includes('غير')
        )
        availability = rawAvailable
      }

      const imageUrl = row[4] ? String(row[4]).trim() : ''
      const colors = row[5] ? String(row[5]).trim() : ''
      const sizes = row[6] ? String(row[6]).trim() : ''
      const categoryName = row[7] ? String(row[7]).trim() : ''

      // Dynamic Extra Attributes mapping
      const extraAttributes: Record<string, any> = {}
      if (template.extraFields && template.extraFields.length > 0) {
        template.extraFields.forEach((fieldKey, idx) => {
          const colVal = row[5 + idx] ? String(row[5 + idx]).trim() : ''
          if (colVal) {
            extraAttributes[fieldKey] = colVal
          }
        })
      }

      validProductsToSync.push({
        name: rawName,
        price: priceNum,
        description,
        inStock,
        availability,
        productType: template.productType,
        imageUrl,
        colors,
        sizes,
        categoryName,
        extraAttributes
      })
    }

    if (validProductsToSync.length === 0) {
      const warningMsg = 'لم يتم العثور على أسماء منتجات في العمود الأول (A). تأكد من إضافة اسم المنتج في العمود الأول.'
      await db.execute(
        sql`UPDATE merchants 
            SET last_sync_status = 'error', 
                last_sync_error = ${warningMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: warningMsg }
    }

    // 6. Fetch existing products for this merchant
    const existingProdRes = await db.execute(
      sql`SELECT id, name, price, description, image_urls, is_active FROM products WHERE merchant_id = ${merchantId}`
    )
    const existingProducts = existingProdRes.rows as unknown as any[]
    
    // Map existing products by lowercase name
    const existingMap = new Map<string, any>()
    for (const prod of existingProducts) {
      existingMap.set(prod.name.toLowerCase().trim(), prod)
    }

    const processedProductIds = new Set<string>()

    // 7. Process Upsert
    for (const prodItem of validProductsToSync) {
      const key = prodItem.name.toLowerCase().trim()
      const existing = existingMap.get(key)
      const imagesArray = prodItem.imageUrl ? [prodItem.imageUrl] : []
      const arrayLiteral = '{' + imagesArray.map((img: string) => `"${img.replace(/"/g, '\\"')}"`).join(',') + '}'
      const extraJson = JSON.stringify(prodItem.extraAttributes)

      if (existing) {
        // Update existing product
        processedProductIds.add(existing.id)
        await db.execute(
          sql`UPDATE products 
              SET price = ${prodItem.price}, 
                  description = ${prodItem.description || existing.description || null},
                  image_urls = ${prodItem.imageUrl ? arrayLiteral : existing.image_urls},
                  is_active = ${prodItem.inStock},
                  colors = ${prodItem.colors || null},
                  sizes = ${prodItem.sizes || null},
                  category_name = ${prodItem.categoryName || null},
                  product_type = ${prodItem.productType},
                  in_stock = ${prodItem.inStock},
                  availability = ${prodItem.availability || null},
                  extra_attributes = ${extraJson}::jsonb
              WHERE id = ${existing.id}`
        )
      } else {
        // Add new product
        const insertRes = await db.execute(
          sql`INSERT INTO products (
                merchant_id, name, price, description, image_urls, is_active, 
                colors, sizes, category_name, product_type, in_stock, availability, extra_attributes
              )
              VALUES (
                ${merchantId}, ${prodItem.name}, ${prodItem.price}, ${prodItem.description || null}, ${arrayLiteral}, 
                ${prodItem.inStock}, ${prodItem.colors || null}, ${prodItem.sizes || null}, ${prodItem.categoryName || null},
                ${prodItem.productType}, ${prodItem.inStock}, ${prodItem.availability || null}, ${extraJson}::jsonb
              )
              RETURNING id`
        )
        const insertedRows = insertRes.rows as unknown as any[]
        if (insertedRows && insertedRows.length > 0) {
          processedProductIds.add(insertedRows[0].id)
        }
      }
    }

    // 8. Soft-disable products in DB that were removed from the Sheet
    for (const existingProd of existingProducts) {
      if (!processedProductIds.has(existingProd.id)) {
        await db.execute(
          sql`UPDATE products SET is_active = false WHERE id = ${existingProd.id}`
        )
      }
    }

    // 9. Update merchant sync metadata
    const syncNotes = null

    await db.execute(
      sql`UPDATE merchants 
          SET last_synced_at = NOW(), 
              last_sync_status = 'success', 
              last_sync_error = ${syncNotes},
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )

    return { success: true, count: validProductsToSync.length }
  } catch (error: any) {
    console.error(`syncMerchantSheet error for merchant ${merchantId}:`, error)
    const errorMsg = error.message || 'حدث خطأ أثناء المزامنة'
    await db.execute(
      sql`UPDATE merchants 
          SET last_sync_status = 'error', 
              last_sync_error = ${errorMsg},
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )
    return { error: errorMsg }
  }
}

/**
 * Performs full orders sync for a merchant from their linked Google Sheet.
 */
export async function syncMerchantOrders(merchantId: string) {
  try {
    // 1. Fetch merchant details
    const merchantRes = await db.execute(
      sql`SELECT id, google_sheet_id, orders_sheet_id, google_refresh_token FROM merchants WHERE id = ${merchantId}`
    )
    const merchantRows = merchantRes.rows as unknown as any[]
    if (!merchantRows || merchantRows.length === 0) {
      return { error: 'Merchant not found' }
    }

    const merchant = merchantRows[0]
    const sheetId = merchant.orders_sheet_id || merchant.google_sheet_id
    if (!sheetId || !merchant.google_refresh_token) {
      return { error: 'Orders Google Sheet is not connected' }
    }

    // 2. Get Access Token
    let accessToken: string
    try {
      accessToken = await getAccessTokenFromRefreshToken(merchant.google_refresh_token)
    } catch (authError: any) {
      console.error(`Orders Sync Auth Error for merchant ${merchantId}:`, authError)
      const errorMsg = 'انقطع الاتصال بـ Google Sheets، يرجى إعادة الربط وتجديد التصريح'
      await db.execute(
        sql`UPDATE merchants 
            SET orders_last_sync_status = 'error', 
                orders_last_sync_error = ${errorMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: errorMsg }
    }

    // 3. Fetch Rows from Sheet (Range A1:F1000)
    let rows: string[][] = []
    try {
      rows = await fetchSheetRows(sheetId, accessToken, 'A1:F1000')
    } catch (sheetError: any) {
      console.error(`Orders Sheet Fetch Error for merchant ${merchantId}:`, sheetError)
      const errorMsg = `فشل قراءة شيت الأوردرات: ${sheetError.message || 'تأكد من وجود الشيت ومشاركته'}`
      await db.execute(
        sql`UPDATE merchants 
            SET orders_last_sync_status = 'error', 
                orders_last_sync_error = ${errorMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: errorMsg }
    }

    if (!rows || rows.length === 0) {
      const warningMsg = 'شيت الأوردرات فارغ أو لا يحتوي على بيانات'
      await db.execute(
        sql`UPDATE merchants 
            SET orders_last_sync_status = 'error', 
                orders_last_sync_error = ${warningMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: warningMsg }
    }

    // 4. Parse Orders
    // Col A (0): Order ID | Col B (1): Customer Name | Col C (2): Product Name | Col D (3): Status | Col E (4): Expected Date | Col F (5): Notes
    const validOrdersToSync: Array<{
      orderIdExt: string
      customerName: string
      productName: string
      status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
      expectedDate: string
      notes: string
    }> = []

    let unmappedStatusCount = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const orderIdExt = row[0] ? String(row[0]).trim() : ''
      if (!orderIdExt) continue

      // Header row detection
      const lowerOrderId = orderIdExt.toLowerCase()
      if (
        i === 0 && (
          lowerOrderId === 'order id' ||
          lowerOrderId === 'رقم الطلب' ||
          lowerOrderId === 'الأوردر' ||
          lowerOrderId === 'كود الطلب' ||
          lowerOrderId.includes('order') ||
          lowerOrderId.includes('طلب')
        )
      ) {
        continue // Skip header row
      }

      const customerName = row[1] ? String(row[1]).trim() : ''
      const productName = row[2] ? String(row[2]).trim() : ''
      const rawStatus = row[3] ? String(row[3]).trim().toLowerCase() : ''
      const expectedDate = row[4] ? String(row[4]).trim() : ''
      const notes = row[5] ? String(row[5]).trim() : ''

      // Map Status enum
      let status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' = 'PENDING'

      if (rawStatus.includes('شحن') || rawStatus.includes('طريق') || rawStatus === 'shipped') {
        status = 'SHIPPED'
      } else if (rawStatus.includes('تسليم') || rawStatus.includes('توصيل') || rawStatus.includes('مكتمل') || rawStatus === 'delivered') {
        status = 'DELIVERED'
      } else if (rawStatus.includes('ملغ') || rawStatus.includes('إلغاء') || rawStatus === 'cancelled' || rawStatus === 'canceled') {
        status = 'CANCELLED'
      } else if (rawStatus.includes('تجهيز') || rawStatus.includes('معالجة') || rawStatus === 'pending') {
        status = 'PENDING'
      } else {
        // Fallback to PENDING if unmapped
        status = 'PENDING'
        if (rawStatus) unmappedStatusCount++
      }

      validOrdersToSync.push({
        orderIdExt,
        customerName,
        productName,
        status,
        expectedDate,
        notes
      })
    }

    if (validOrdersToSync.length === 0) {
      const warningMsg = 'لم يتم العثور على أرقام أوردرات في العمود الأول (A)'
      await db.execute(
        sql`UPDATE merchants 
            SET orders_last_sync_status = 'error', 
                orders_last_sync_error = ${warningMsg},
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
      return { error: warningMsg }
    }

    // 5. Upsert Orders into DB
    for (const ord of validOrdersToSync) {
      await db.execute(
        sql`INSERT INTO orders (merchant_id, order_id_external, customer_name, product_name, status, expected_date, notes, last_synced_at)
            VALUES (${merchantId}, ${ord.orderIdExt}, ${ord.customerName || null}, ${ord.productName || null}, ${ord.status}, ${ord.expectedDate || null}, ${ord.notes || null}, NOW())
            ON CONFLICT (merchant_id, order_id_external)
            DO UPDATE SET
              customer_name = EXCLUDED.customer_name,
              product_name = EXCLUDED.product_name,
              status = EXCLUDED.status,
              expected_date = EXCLUDED.expected_date,
              notes = EXCLUDED.notes,
              last_synced_at = NOW()`
      )
    }

    const syncNotes = unmappedStatusCount > 0 
      ? `تمت المزامنة مع افتراض حالة "قيد التجهيز" لعدد ${unmappedStatusCount} صفوف ذات حالات غير محددة` 
      : null

    await db.execute(
      sql`UPDATE merchants 
          SET orders_last_synced_at = NOW(), 
              orders_last_sync_status = 'success', 
              orders_last_sync_error = ${syncNotes},
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )

    return { success: true, count: validOrdersToSync.length }
  } catch (error: any) {
    console.error(`syncMerchantOrders error for merchant ${merchantId}:`, error)
    const errorMsg = error.message || 'حدث خطأ أثناء مزامنة الأوردرات'
    await db.execute(
      sql`UPDATE merchants 
          SET orders_last_sync_status = 'error', 
              orders_last_sync_error = ${errorMsg},
              updated_at = NOW() 
          WHERE id = ${merchantId}`
    )
    return { error: errorMsg }
  }
}
