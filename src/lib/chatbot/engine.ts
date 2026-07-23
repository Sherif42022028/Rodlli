import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { generateText, tool, stepCountIs, zodSchema } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { searchProducts, getProductDetails, getFAQAnswer, checkWorkingHours, checkOrderStatus } from './tools'
import { searchOramaHybrid } from '@/lib/orama/engine'

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return ''
  let cleaned = phone.replace(/[^0-9]/g, '')
  // Egypt numbers starting with 01 (e.g. 01012345678 -> 201012345678)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '2' + cleaned
  }
  return cleaned
}

interface QuickReply {
  text: string
  textAr?: string
  action: string
  payload?: any
}

interface ChatbotResponse {
  text: string
  type: 'text' | 'products' | 'hours' | 'faq' | 'link'
  quickReplies?: QuickReply[]
  data?: any
  confident?: boolean
  whatsappPhone?: string | null
  whatsappUrl?: string | null
  whatsappQrUrl?: string | null
}

export class ChatbotEngine {
  private merchantId: string

  constructor(merchantId: string) {
    this.merchantId = merchantId
  }

  private matchesKeywords(message: string, keywords: string[]): boolean {
    const msg = message.toLowerCase()
    const words = msg.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/)
    return keywords.some((kw) => {
      const kwLower = kw.toLowerCase()
      if (kwLower.includes(' ')) {
        return msg.includes(kwLower)
      }
      return words.includes(kwLower)
    })
  }

  // Retrieve past message history for memory context
  private async getConversationHistory(conversationId: string): Promise<any[]> {
    try {
      const result = await db.execute(
        sql`SELECT sender_type, content 
            FROM messages 
            WHERE conversation_id = ${conversationId} 
            ORDER BY created_at DESC 
            LIMIT 10`
      )
      // Reverse to get chronological order
      return (result.rows as unknown as any[]).reverse()
    } catch (e) {
      console.error('getConversationHistory error:', e)
      return []
    }
  }

  // Log unanswered queries to database
  private async logUnansweredQuestion(userMessage: string, conversationId?: string | null) {
    try {
      const convUUID = conversationId || null
      await db.execute(
        sql`INSERT INTO unanswered_questions (merchant_id, question_text, conversation_id)
            VALUES (${this.merchantId}, ${userMessage}, ${convUUID})`
      )
      console.log('Logged unanswered question:', userMessage)
    } catch (e) {
      console.error('logUnansweredQuestion error:', e)
    }
  }

  // Fetch merchant metadata
  private async getMerchantName(): Promise<string> {
    try {
      const result = await db.execute(
        sql`SELECT business_name FROM merchants WHERE id = ${this.merchantId} LIMIT 1`
      )
      const rows = result.rows as unknown as any[]
      return rows && rows.length > 0 ? rows[0].business_name : 'Rodlli Merchant'
    } catch {
      return 'Rodlli Merchant'
    }
  }

  public async getMerchantWhatsAppContact(userQuery: string): Promise<{ whatsappPhone: string | null; whatsappUrl: string | null; whatsappQrUrl: string | null }> {
    try {
      const result = await db.execute(
        sql`SELECT business_phone FROM merchants WHERE id = ${this.merchantId} LIMIT 1`
      )
      const rows = result.rows as unknown as any[]
      const rawPhone = rows && rows.length > 0 ? rows[0].business_phone : null
      if (!rawPhone) return { whatsappPhone: null, whatsappUrl: null, whatsappQrUrl: null }

      const cleanedPhone = formatWhatsAppPhone(rawPhone)
      if (!cleanedPhone) return { whatsappPhone: null, whatsappUrl: null, whatsappQrUrl: null }

      const prefilledText = encodeURIComponent(`مرحباً، أحتاج مساعدة بشأن استفساري: "${userQuery}"`)
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${prefilledText}`
      const whatsappQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(whatsappUrl)}&size=200x200&margin=1`

      return {
        whatsappPhone: cleanedPhone,
        whatsappUrl,
        whatsappQrUrl
      }
    } catch {
      return { whatsappPhone: null, whatsappUrl: null, whatsappQrUrl: null }
    }
  }

  private async logToolCall(
    toolName: string,
    toolInput: any,
    conversationId?: string | null,
    matchedProductId?: string | null
  ) {
    try {
      const convUUID = conversationId || null
      const inputJson = JSON.stringify(toolInput)
      const productUUID = matchedProductId || null

      await db.execute(
        sql`INSERT INTO tool_call_logs (merchant_id, conversation_id, tool_name, tool_input, matched_product_id)
            VALUES (${this.merchantId}, ${convUUID}, ${toolName}, ${inputJson}::jsonb, ${productUUID})`
      )

      // Interest Scoring: If asking about products or searching products
      if (convUUID && (toolName === 'searchProducts' || toolName === 'getProductDetails')) {
        const result = await db.execute(
          sql`SELECT c.buyer_id, m.category_id 
              FROM conversations c
              JOIN merchants m ON c.merchant_id = m.id
              WHERE c.id = ${convUUID} LIMIT 1`
        )
        const row = result.rows[0] as any
        const buyerId = row?.buyer_id
        const categoryId = row?.category_id

        if (buyerId && categoryId) {
          // Increment buyer category interest by 1 (ASK_ABOUT_PRODUCT weight) up to max score 20
          await db.execute(
            sql`INSERT INTO buyer_interests (buyer_id, category_id, score)
                VALUES (${buyerId}, ${categoryId}, 1)
                ON CONFLICT (buyer_id, category_id)
                DO UPDATE SET 
                  score = LEAST(20, buyer_interests.score + 1),
                  updated_at = NOW()`
          )
        }
      }
    } catch (e) {
      console.error('logToolCall error:', e)
    }
  }

  private async logContactRequest(conversationId?: string | null) {
    if (!conversationId) return
    try {
      await db.execute(
        sql`INSERT INTO contact_requests (merchant_id, conversation_id)
            VALUES (${this.merchantId}, ${conversationId})`
      )
    } catch (e) {
      console.error('logContactRequest error:', e)
    }
  }

  /**
   * ⚠️ SINGLE SOURCE OF TRUTH — المحرك الأساسي لمعالجة الاستعلامات (Hybrid Engine).
   * يُستدعى بواسطة Server Action `queryChatbot` المستهلك من قِبل الشات المستقل والـ Widget الإطار.
   */
  async processMessage(
    userMessage: string, 
    language: 'en' | 'ar' = 'en',
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const lowerMsg = userMessage.toLowerCase().trim()

    // Check if query is explicitly an order tracking query (e.g. "رقم الاوردر", "رقم الطلب", "order status #102")
    const isOrderSpecific = lowerMsg.includes('أوردر') || lowerMsg.includes('طلب') || lowerMsg.includes('order') || lowerMsg.includes('#')

    // Detect ANY phone number or contact-related question regardless of phrasing
    const isContactMsg = !isOrderSpecific && (
      this.matchesKeywords(lowerMsg, [
        'contact', 'support', 'phone', 'mobile', 'whatsapp', 'wa', 'call', 'reach', 'number', 'telephone',
        'تواصل', 'دعم', 'اتصال', 'تلفون', 'تليفون', 'هاتف', 'موبايل', 'رقم', 'واتس', 'واتساب', 'كلمكم', 'اتكلم', 'نكلمكم', 'رقمكم', 'خدمة العملاء'
      ]) || /(?:رقم|تلفون|تليفون|هاتف|موبايل|واتس|واتساب|تواصل|اتصال|دعم|phone|mobile|whatsapp|number|call)/i.test(lowerMsg)
    )

    if (isContactMsg) {
      await this.logContactRequest(conversationId)
      const waContact = await this.getMerchantWhatsAppContact(userMessage)

      if (waContact.whatsappPhone || waContact.whatsappUrl) {
        return {
          text: language === 'en'
            ? `Here is our direct store contact number:\n📞 *${waContact.whatsappPhone || ''}*\n\nYou can click the button below or scan the QR code to open a direct WhatsApp chat!`
            : `إليك رقم تواصل متجرنا المباشر:\n📞 *${waContact.whatsappPhone || ''}*\n\nيمكنك الضغط على الزر أدناه أو مسح كود الـ QR لبدء محادثة مباشرة عبر الواتساب!`,
          type: 'text',
          confident: true,
          whatsappPhone: waContact.whatsappPhone,
          whatsappUrl: waContact.whatsappUrl,
          whatsappQrUrl: waContact.whatsappQrUrl,
          quickReplies: [
            ...(waContact.whatsappUrl ? [{
              text: '💬 تحدث مع التاجر على الواتساب',
              textAr: '💬 تحدث مع التاجر على الواتساب',
              action: 'open_url',
              payload: waContact.whatsappUrl
            }] : [])
          ]
        }
      }
    }

    // Layer 1: Deterministic / Rule-Based Engine First
    // Instant response (0ms AI delay, 0 cost, 100% deterministic accuracy)
    const localResult = await this.processMessageLocal(userMessage, language, conversationId)
    if (localResult.confident) {
      return localResult
    }

    // Layer 1.5: Orama Hybrid Search Engine (Fast & High Accuracy Semantic/Text Match)
    try {
      const oramaRes = await searchOramaHybrid(this.merchantId, userMessage)
      if (oramaRes) {
        await this.logToolCall(`orama_${oramaRes.type}`, { query: userMessage, confidence: oramaRes.confidence }, conversationId)
        return {
          text: oramaRes.replyText,
          type: oramaRes.type === 'product' ? 'products' : 'faq',
          confident: true,
          data: oramaRes.matchedItem,
        }
      }
    } catch (e) {
      console.error('Orama Hybrid Search error in engine:', e)
    }

    // Layer 2: AI Layer (Zhipu GLM / Gemini Function Calling)
    let fallbackResponse: ChatbotResponse = localResult

    const zhipuApiKey = process.env.ZHIPU_API_KEY
    if (zhipuApiKey) {
      try {
        const aiResult = await this.processMessageWithZhipu(userMessage, language, zhipuApiKey, conversationId)
        if (aiResult.confident) {
          return aiResult
        }
        fallbackResponse = aiResult
      } catch (error) {
        console.error('Zhipu AI processing failed, falling back to Gemini/local engine:', error)
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const aiResult = await this.processMessageWithGemini(userMessage, language, apiKey, conversationId)
        if (aiResult.confident) {
          return aiResult
        }
        fallbackResponse = aiResult
      } catch (error) {
        console.error('Gemini processing failed, falling back to local engine:', error)
      }
    }

    // Layer 3: Fallback handling when AI/Local engine is not confident
    await this.logUnansweredQuestion(userMessage, conversationId)

    // Attach WhatsApp Merchant Contact Details (Phone, direct wa.me link with prefilled text, and QR code)
    const waContact = await this.getMerchantWhatsAppContact(userMessage)
    return {
      ...fallbackResponse,
      whatsappPhone: waContact.whatsappPhone,
      whatsappUrl: waContact.whatsappUrl,
      whatsappQrUrl: waContact.whatsappQrUrl,
      quickReplies: [
        ...(fallbackResponse.quickReplies || []),
        ...(waContact.whatsappUrl ? [{
          text: '💬 تحدث مع التاجر على الواتساب',
          textAr: '💬 تحدث مع التاجر على الواتساب',
          action: 'open_url',
          payload: waContact.whatsappUrl
        }] : [])
      ]
    }
  }

  private getVercelAITools(conversationId?: string | null) {
    return {
      searchProducts: tool({
        description: 'Search products in the merchant catalog matching a search query keyword.',
        inputSchema: zodSchema(z.object({
          query: z.string().describe('Search term/keyword'),
        })),
        execute: async ({ query }: { query: string }) => {
          const res = await searchProducts(query, this.merchantId)
          const firstProdId = res && res.length > 0 ? res[0].id : null
          await this.logToolCall('searchProducts', { query }, conversationId, firstProdId)
          return res
        }
      }),
      getProductDetails: tool({
        description: 'Get complete attributes and pricing for a single product UUID.',
        inputSchema: zodSchema(z.object({
          productId: z.string().describe('The product UUID')
        })),
        execute: async ({ productId }: { productId: string }) => {
          const res = await getProductDetails(productId)
          await this.logToolCall('getProductDetails', { productId }, conversationId, productId)
          return res
        }
      }),
      getFAQAnswer: tool({
        description: 'Scan merchant FAQs for queries matching delivery options, policies, or questions.',
        inputSchema: zodSchema(z.object({
          topic: z.string().describe('Question/topic keyword')
        })),
        execute: async ({ topic }: { topic: string }) => {
          const res = await getFAQAnswer(topic, this.merchantId)
          await this.logToolCall('getFAQAnswer', { topic }, conversationId, null)
          return res
        }
      }),
      checkWorkingHours: tool({
        description: 'Check store opening hours, closure dates and schedules.',
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          const res = await checkWorkingHours(this.merchantId)
          await this.logToolCall('checkWorkingHours', {}, conversationId, null)
          return res
        }
      }),
      checkOrderStatus: tool({
        description: 'Check status, delivery estimate, and notes for a customer order by order ID.',
        inputSchema: zodSchema(z.object({
          orderId: z.string().describe('The order ID string e.g. RD-1032 or 1032')
        })),
        execute: async ({ orderId }: { orderId: string }) => {
          const res = await checkOrderStatus(orderId, this.merchantId)
          await this.logToolCall('checkOrderStatus', { orderId }, conversationId, null)
          return res
        }
      })
    }
  }

  // 1. Google Gemini AI Engine with Vercel AI SDK
  private async processMessageWithGemini(
    userMessage: string,
    language: 'en' | 'ar',
    apiKey: string,
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const google = createGoogleGenerativeAI({ apiKey })
    const businessName = await this.getMerchantName()
    const systemInstruction = `
      You are an expert sales assistant for the store "${businessName}" (ID: ${this.merchantId}).
      You must ONLY answer based on data retrieved from the tools. Do NOT hallucinate prices or details.
      
      Response Format Guidelines:
      1. You must respond in JSON matching this schema:
         {
           "reply": "your text response goes here",
           "confident": true/false
         }
      2. If the user query is outside the scope of the store data or the tools do not return matching info, set "confident" to false. Set "reply" to an apology stating you don't have this info.
      3. If product or service details contain extra attributes (like colors, sizes, ingredients, allergens, portion size, model, warranty, specs, service duration, or available times/days), include them naturally in your response. If an attribute is missing, do not mention it.
      4. Respond concisely (maximum 2-3 sentences) in the same language as the user query.
    `

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (conversationId) {
      const history = await this.getConversationHistory(conversationId)
      for (const m of history) {
        messages.push({
          role: m.sender_type === 'bot' ? 'assistant' : 'user',
          content: m.content
        })
      }
    }

    messages.push({ role: 'user', content: userMessage })

    const result = await generateText({
      model: google('gemini-1.5-flash'),
      system: systemInstruction,
      messages,
      tools: this.getVercelAITools(conversationId),
      stopWhen: stepCountIs(3),
    })

    const rawText = result.text.trim()
    let parsed: any = { reply: rawText, confident: true }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      parsed = { reply: rawText, confident: true }
    }

    if (parsed.confident === false) {
      await this.logUnansweredQuestion(userMessage, conversationId)
      return {
        text: language === 'en'
          ? "I have logged your question for the store support team. They will reply shortly!"
          : "لقد قمت بنقل استفسارك لفريق دعم المتجر، وسيتم الرد عليك قريباً!",
        type: 'text',
        confident: false
      }
    }

    return {
      text: parsed.reply || rawText,
      type: 'text',
      confident: true,
      quickReplies: [
        { text: "Products Catalog", textAr: "كتالوج المنتجات", action: 'show_menu' },
        { text: "Business Hours", textAr: "مواعيد العمل", action: 'show_hours' }
      ]
    }
  }

  // 1.5. Zhipu AI (GLM) Engine with Vercel AI SDK (OpenAI Compatible)
  private async processMessageWithZhipu(
    userMessage: string,
    language: 'en' | 'ar',
    apiKey: string,
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const zhipuModel = process.env.ZHIPU_MODEL || 'glm-4.7-flash'
    const zhipu = createOpenAICompatible({
      name: 'zhipu',
      apiKey,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4'
    })

    const businessName = await this.getMerchantName()
    const systemInstruction = `
      You are an expert sales assistant for the store "${businessName}" (ID: ${this.merchantId}).
      You must ONLY answer based on data retrieved from the tools. Do NOT hallucinate prices or details.
      
      Response Format Guidelines:
      1. You must respond in JSON matching this schema:
         {
           "reply": "your text response goes here",
           "confident": true/false
         }
      2. If the user query is outside the scope of the store data or the tools do not return matching info, set "confident" to false. Set "reply" to an apology stating you don't have this info.
      3. If product or service details contain extra attributes (like colors, sizes, ingredients, allergens, portion size, model, warranty, specs, service duration, or available times/days), include them naturally in your response. If an attribute is missing, do not mention it.
      4. Respond concisely (maximum 2-3 sentences) in the same language as the user query.
    `

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    if (conversationId) {
      const history = await this.getConversationHistory(conversationId)
      for (const m of history) {
        messages.push({
          role: m.sender_type === 'bot' ? 'assistant' : 'user',
          content: m.content
        })
      }
    }

    messages.push({ role: 'user', content: userMessage })

    const result = await generateText({
      model: zhipu(zhipuModel),
      system: systemInstruction,
      messages,
      tools: this.getVercelAITools(conversationId),
      stopWhen: stepCountIs(3),
    })

    const rawText = result.text.trim()
    let parsed: any = { reply: rawText, confident: true }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      }
    } catch {
      parsed = { reply: rawText, confident: true }
    }

    if (parsed.confident === false) {
      await this.logUnansweredQuestion(userMessage, conversationId)
      return {
        text: language === 'en'
          ? "I have logged your question for the store support team. They will reply shortly!"
          : "لقد قمت بنقل استفسارك لفريق دعم المتجر، وسيتم الرد عليك قريباً!",
        type: 'text',
        confident: false
      }
    }

    return {
      text: parsed.reply || rawText,
      type: 'text',
      confident: true,
      quickReplies: [
        { text: "Products Catalog", textAr: "كتالوج المنتجات", action: 'show_menu' },
        { text: "Business Hours", textAr: "مواعيد العمل", action: 'show_hours' }
      ]
    }
  }

  // 2. Rule-Based Local Fallback Engine
  private async processMessageLocal(
    userMessage: string, 
    language: 'en' | 'ar',
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const lowerMsg = userMessage.toLowerCase().trim()

    // 0. Product Name Direct Match
    try {
      const productResult = await db.execute(
        sql`SELECT id, name, price, description, image_urls, colors, sizes, category_name FROM products WHERE merchant_id = ${this.merchantId} AND is_active = true`
      )
      const products = productResult.rows as unknown as any[]
      
      for (const p of products) {
        const prodName = p.name.toLowerCase()
        if (lowerMsg.includes(prodName)) {
          await this.logToolCall('getProductDetails', { productId: p.id }, conversationId, p.id)
          const colorsStr = p.colors ? (language === 'en' ? `\n*Colors:* ${p.colors}` : `\n*الألوان:* ${p.colors}`) : ''
          const sizesStr = p.sizes ? (language === 'en' ? `\n*Sizes:* ${p.sizes}` : `\n*المقاسات:* ${p.sizes}`) : ''

          return {
            text: language === 'en'
              ? `Here is the product info:\n\n*Product:* ${p.name}\n*Price:* ${p.price} EGP${colorsStr}${sizesStr}\n*Description:* ${p.description || 'No description available.'}`
              : `إليك تفاصيل المنتج:\n\n*المنتج:* ${p.name}\n*السعر:* ${p.price} ج.م${colorsStr}${sizesStr}\n*الوصف:* ${p.description || 'لا يوجد وصف متاح.'}`,
            type: 'products',
            data: [p],
            confident: true,
            quickReplies: [
              { text: "View All Products", textAr: "عرض كل المنتجات", action: 'show_menu' }
            ]
          }
        }
      }
    } catch (e) {
      console.error('Local product match error:', e)
    }

    // 0.5 Order Status Direct Check & Pattern Extraction
    const isOrderQuery = this.matchesKeywords(lowerMsg, ['order', 'status', 'track', 'أوردر', 'طلب', 'شحن', 'متابعة', 'فين', 'رقم']) || lowerMsg.includes('#')
    if (isOrderQuery) {
      // Regex pattern to extract order ID (e.g. RD-1032, ORD-123, #1032, 1032)
      const orderMatch = lowerMsg.match(/(?:(?:order|أوردر|طلب|رقم|كود|#)\s*:?\s*)?([a-z0-9_-]{3,20})/i)
      if (orderMatch && orderMatch[1]) {
        const potentialOrderId = orderMatch[1].trim()
        const orderData = await checkOrderStatus(potentialOrderId, this.merchantId)
        if (orderData.found) {
          await this.logToolCall('checkOrderStatus', { orderId: potentialOrderId }, conversationId, null)
          const dateStr = orderData.expectedDate ? (language === 'en' ? `\n*Expected Date:* ${orderData.expectedDate}` : `\n*التاريخ المتوقع:* ${orderData.expectedDate}`) : ''
          const custStr = orderData.customerName ? (language === 'en' ? `\n*Customer:* ${orderData.customerName}` : `\n*العميل:* ${orderData.customerName}`) : ''
          const prodStr = orderData.productName ? (language === 'en' ? `\n*Product:* ${orderData.productName}` : `\n*المنتج:* ${orderData.productName}`) : ''
          const notesStr = orderData.notes ? (language === 'en' ? `\n*Notes:* ${orderData.notes}` : `\n*ملاحظات:* ${orderData.notes}`) : ''

          const statusLabel = language === 'en' ? orderData.statusEn : orderData.statusAr

          return {
            text: language === 'en'
              ? `📦 *Order Status Update*\n\n*Order ID:* ${orderData.orderId}\n*Status:* ${statusLabel}${custStr}${prodStr}${dateStr}${notesStr}`
              : `📦 *حالة الطلب*\n\n*رقم الأوردر:* ${orderData.orderId}\n*الحالة:* ${statusLabel}${custStr}${prodStr}${dateStr}${notesStr}`,
            type: 'text',
            confident: true,
            quickReplies: [
              { text: "View Products Catalog", textAr: "كتالوج المنتجات", action: 'show_menu' }
            ]
          }
        } else if (/^(rd-|ord-|-|#)/i.test(potentialOrderId) || lowerMsg.includes('#')) {
          // Explicit order ID structure supplied but not found in DB
          await this.logToolCall('checkOrderStatus', { orderId: potentialOrderId }, conversationId, null)
          return {
            text: language === 'en'
              ? `🔍 Order *#${potentialOrderId}* was not found in our records. Please verify your order ID or contact store support.`
              : `🔍 لم نتمكن من العثور على أوردر برقم *#${potentialOrderId}* في سجلاتنا. يرجى التأكد من رقم الطلب أو التواصل مع الدعم.`,
            type: 'text',
            confident: true,
            quickReplies: [
              { text: "Contact Support", textAr: "التحدث مع الدعم", action: 'contact_support' }
            ]
          }
        }
      }
    }

    // 1. Greetings
    if (this.matchesKeywords(lowerMsg, ['hi', 'hello', 'hey', 'مرحبا', 'اهلا', 'سلام'])) {
      return {
        text: language === 'en'
          ? "Hi there! 👋 Welcome to our store. How can I help you today?"
          : "أهلاً بك 👋 في متجرنا! كيف يمكنني مساعدتك اليوم؟",
        type: 'text',
        confident: true,
        quickReplies: [
          { text: "See Products Menu", textAr: "عرض قائمة المنتجات", action: 'show_menu' },
          { text: 'Business Hours', textAr: 'ساعات العمل', action: 'show_hours' }
        ]
      }
    }

    // 2. Products Menu
    if (this.matchesKeywords(lowerMsg, ['menu', 'products', 'catalog', 'today', 'منتجات', 'قائمة', 'معرض', 'عرض'])) {
      await this.logToolCall('searchProducts', { query: 'menu' }, conversationId, null)
      const response = await this.getProducts(language)
      return { ...response, confident: true }
    }

    // 3. Working Hours
    if (this.matchesKeywords(lowerMsg, ['hours', 'open', 'time', 'ساعات', 'متى', 'مواعيد', 'وقت', 'فتح'])) {
      await this.logToolCall('checkWorkingHours', {}, conversationId, null)
      const response = await this.getWorkingHours(language)
      return { ...response, confident: true }
    }

    // 4. Mapped FAQs lookup
    const faqResponse = await this.matchFAQ(lowerMsg, language, conversationId)
    if (faqResponse) {
      return faqResponse
    }

    // 5. Fallback Response (Unmatched in Layer 1, will delegate to Layer 2 / Layer 3)
    return {
      text: language === 'en'
        ? "I'm sorry, I couldn't find an answer to that. I have logged your question for the merchant!"
        : "عذراً، لم أجد إجابة لذلك. لقد قمت بنقل استفسارك لإدارة المتجر لبرمجة إجابته قريباً!",
      type: 'text',
      confident: false,
      quickReplies: [
        { text: "Show Catalog", textAr: "عرض الكتالوج", action: 'show_menu' },
        { text: "Working Hours", textAr: "مواعيد العمل", action: 'show_hours' }
      ]
    }
  }

  private async getProducts(lang: 'en' | 'ar'): Promise<ChatbotResponse> {
    try {
      const result = await db.execute(
        sql`SELECT id, name, price, description, image_urls FROM products WHERE merchant_id = ${this.merchantId} AND is_active = true LIMIT 5`
      )
      const products = result.rows as unknown as any[]

      if (!products || products.length === 0) {
        return {
          text: lang === 'en'
            ? "Currently, we don't have any products in our catalog. Check back soon!"
            : "حالياً، لا توجد أي منتجات معروضة. تفقدنا لاحقاً!",
          type: 'text'
        }
      }

      return {
        text: lang === 'en' ? "Here is our product catalog:" : "إليك كتالوج المنتجات المتوفرة لدينا:",
        type: 'products',
        data: products,
        quickReplies: [
          { text: "Contact Support", textAr: "التحدث مع الدعم", action: 'contact_support' }
        ]
      }
    } catch {
      return {
        text: lang === 'en' ? "Failed to load catalog." : "فشل تحميل كتالوج المنتجات.",
        type: 'text'
      }
    }
  }

  private async getWorkingHours(lang: 'en' | 'ar'): Promise<ChatbotResponse> {
    try {
      const result = await db.execute(
        sql`SELECT day_of_week, open_time, close_time, is_closed FROM working_hours WHERE merchant_id = ${this.merchantId} ORDER BY day_of_week ASC`
      )
      const hours = result.rows as unknown as any[]

      if (!hours || hours.length === 0) {
        return {
          text: lang === 'en'
            ? "Our working hours are not configured yet."
            : "ساعات العمل غير محددة بعد.",
          type: 'text'
        }
      }

      const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

      const listStr = hours.map((h) => {
        const dayName = lang === 'en' ? dayNamesEn[h.day_of_week] : dayNamesAr[h.day_of_week]
        if (h.is_closed) {
          return lang === 'en' ? `${dayName}: Closed` : `${dayName}: مغلق`
        }
        return lang === 'en'
          ? `${dayName}: ${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}`
          : `${dayName}: ${h.open_time.slice(0, 5)} إلى ${h.close_time.slice(0, 5)}`
      }).join('\n')

      return {
        text: lang === 'en'
          ? `Here are our working hours:\n\n${listStr}`
          : `إليك مواعيد وساعات العمل لدينا:\n\n${listStr}`,
        type: 'hours',
        quickReplies: [
          { text: "View Menu", textAr: "عرض القائمة", action: 'show_menu' }
        ]
      }
    } catch {
      return {
        text: lang === 'en' ? "Failed to retrieve working hours." : "فشل تحميل مواعيد العمل.",
        type: 'text'
      }
    }
  }

  private async matchFAQ(lowerMsg: string, lang: 'en' | 'ar', conversationId?: string | null): Promise<ChatbotResponse | null> {
    try {
      const result = await db.execute(
        sql`SELECT question, answer FROM faqs WHERE merchant_id = ${this.merchantId}`
      )
      const faqs = result.rows as unknown as any[]

      for (const faq of faqs) {
        const question = faq.question.toLowerCase()
        if (lowerMsg.includes(question) || question.includes(lowerMsg)) {
          await this.logToolCall('getFAQAnswer', { topic: faq.question }, conversationId, null)
          return {
            text: faq.answer,
            type: 'faq',
            confident: true,
            quickReplies: [
              { text: "Ask Another Question", textAr: "سؤال آخر", action: 'ask_faq' }
            ]
          }
        }
      }
      return null
    } catch {
      return null
    }
  }
}
export type { ChatbotResponse, QuickReply }
