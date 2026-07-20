import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { decryptToken } from '@/lib/encryption'

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
    // 1. Fetch merchant details
    const merchantRes = await db.execute(
      sql`SELECT id, google_sheet_id, google_refresh_token, sheet_sync_enabled FROM merchants WHERE id = ${merchantId}`
    )
    const merchantRows = merchantRes.rows as unknown as any[]
    if (!merchantRows || merchantRows.length === 0) {
      return { error: 'Merchant not found' }
    }

    const merchant = merchantRows[0]
    if (!merchant.google_sheet_id || !merchant.google_refresh_token) {
      return { error: 'Google Sheet is not connected' }
    }

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
    // Col A (0): Name | Col B (1): Price | Col C (2): Description | Col D (3): Available (نعم/لا) | Col E (4): Image URL
    const validProductsToSync: Array<{
      name: string
      price: number
      description: string
      inStock: boolean
      imageUrl: string
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
      const rawAvailable = row[3] ? String(row[3]).trim().toLowerCase() : ''
      
      // Stock check: default is true unless explicitly 'لا', 'no', 'false', '0', 'غير متوفر'
      const inStock = !(
        rawAvailable === 'لا' || 
        rawAvailable === 'no' || 
        rawAvailable === 'false' || 
        rawAvailable === '0' || 
        rawAvailable.includes('غير')
      )

      const imageUrl = row[4] ? String(row[4]).trim() : ''

      validProductsToSync.push({
        name: rawName,
        price: priceNum,
        description,
        inStock,
        imageUrl
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

      if (existing) {
        // Update existing product
        processedProductIds.add(existing.id)
        await db.execute(
          sql`UPDATE products 
              SET price = ${prodItem.price}, 
                  description = ${prodItem.description || existing.description || null},
                  image_urls = ${prodItem.imageUrl ? arrayLiteral : existing.image_urls},
                  is_active = ${prodItem.inStock}
              WHERE id = ${existing.id}`
        )
      } else {
        // Add new product
        const insertRes = await db.execute(
          sql`INSERT INTO products (merchant_id, name, price, description, image_urls, is_active)
              VALUES (${merchantId}, ${prodItem.name}, ${prodItem.price}, ${prodItem.description || null}, ${arrayLiteral}, ${prodItem.inStock})
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
