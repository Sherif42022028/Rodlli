import { create, insert, search, AnyOrama } from '@orama/orama'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export interface OramaSearchResult {
  type: 'faq' | 'product' | 'hours'
  confidence: number
  matchedItem: any
  replyText: string
}

interface MerchantOramaStores {
  faqDb: AnyOrama
  productDb: AnyOrama
  lastBuilt: number
}

// Per-merchant in-memory Orama index cache (Tenant Isolation)
const merchantCache = new Map<string, MerchantOramaStores>()

/**
 * 1. Create Orama schema for FAQs
 */
async function createFaqDb() {
  return await create({
    schema: {
      id: 'string',
      question: 'string',
      answer: 'string',
      keywords: 'string',
      merchantId: 'string',
    },
  })
}

/**
 * 2. Create Orama schema for Products
 */
async function createProductDb() {
  return await create({
    schema: {
      id: 'string',
      name: 'string',
      description: 'string',
      category: 'string',
      price: 'number',
      inStock: 'boolean',
      merchantId: 'string',
    },
  })
}

/**
 * 3. Build & Populate Orama Indexes for a specific Merchant
 */
export async function buildOramaIndexForMerchant(merchantId: string): Promise<MerchantOramaStores> {
  const faqDb = await createFaqDb()
  const productDb = await createProductDb()

  try {
    // 3a. Load FAQs
    const faqRes = await db.execute(
      sql`SELECT id, question, answer, keywords FROM faqs WHERE merchant_id = ${merchantId}`
    )
    const faqs = (faqRes.rows as unknown as any[]) || []
    for (const faq of faqs) {
      await insert(faqDb, {
        id: String(faq.id),
        question: String(faq.question || ''),
        answer: String(faq.answer || ''),
        keywords: Array.isArray(faq.keywords) ? faq.keywords.join(' ') : String(faq.keywords || ''),
        merchantId,
      })
    }

    // 3b. Load Products
    const prodRes = await db.execute(
      sql`SELECT id, name, description, category, price, in_stock FROM products WHERE merchant_id = ${merchantId}`
    )
    const products = (prodRes.rows as unknown as any[]) || []
    for (const p of products) {
      await insert(productDb, {
        id: String(p.id),
        name: String(p.name || ''),
        description: String(p.description || ''),
        category: String(p.category || ''),
        price: Number(p.price || 0),
        inStock: Boolean(p.in_stock !== false),
        merchantId,
      })
    }
  } catch (error) {
    console.error(`Error populating Orama index for merchant ${merchantId}:`, error)
  }

  const stores: MerchantOramaStores = {
    faqDb,
    productDb,
    lastBuilt: Date.now(),
  }

  merchantCache.set(merchantId, stores)
  return stores
}

/**
 * Get or initialize cached Orama stores for a merchant
 */
export async function getMerchantOramaStores(merchantId: string): Promise<MerchantOramaStores> {
  const cached = merchantCache.get(merchantId)
  if (cached && Date.now() - cached.lastBuilt < 15 * 60 * 1000) {
    return cached
  }
  return await buildOramaIndexForMerchant(merchantId)
}

/**
 * Invalidate cached Orama index for a merchant (e.g. after Google Sheets sync or manual edit)
 */
export function invalidateMerchantOramaIndex(merchantId: string) {
  merchantCache.delete(merchantId)
}

/**
 * 4. Search Orama Hybrid Engine for FAQs or Products matching user message
 */
export async function searchOramaHybrid(
  merchantId: string,
  userMessage: string
): Promise<OramaSearchResult | null> {
  if (!userMessage || !userMessage.trim()) return null

  try {
    const stores = await getMerchantOramaStores(merchantId)
    const cleanQuery = userMessage.trim().toLowerCase()

    // 4a. Search FAQs
    const faqSearchRes = await search(stores.faqDb, {
      term: cleanQuery,
      tolerance: 2, // Typo tolerance for Arabic/English queries
      limit: 3,
    })

    if (faqSearchRes.hits.length > 0) {
      const topHit = faqSearchRes.hits[0]
      // Check confidence score (Orama score higher is better match)
      if (topHit.score > 0.3) {
        return {
          type: 'faq',
          confidence: topHit.score,
          matchedItem: topHit.document,
          replyText: String(topHit.document.answer),
        }
      }
    }

    // 4b. Search Products
    const productSearchRes = await search(stores.productDb, {
      term: cleanQuery,
      tolerance: 2,
      limit: 3,
    })

    if (productSearchRes.hits.length > 0) {
      const topProduct = productSearchRes.hits[0]
      if (topProduct.score > 0.4) {
        const doc = topProduct.document
        const priceFormatted = doc.price ? `${doc.price} EGP` : ''
        const stockStatus = doc.inStock ? 'متوفر حالياً 🛒' : 'غير متوفر حالياً ❌'
        const replyText = `إليك تفاصيل ${doc.name}:\n\n- السعر: ${priceFormatted}\n- الحالة: ${stockStatus}\n\n${doc.description || ''}`

        return {
          type: 'product',
          confidence: topProduct.score,
          matchedItem: doc,
          replyText: replyText.trim(),
        }
      }
    }

    return null
  } catch (error) {
    console.error('searchOramaHybrid error:', error)
    return null
  }
}
