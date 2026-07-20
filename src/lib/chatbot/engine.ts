import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { searchProducts, getProductDetails, getFAQAnswer, checkWorkingHours } from './tools'

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

  async processMessage(
    userMessage: string, 
    language: 'en' | 'ar' = 'en',
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const lowerMsg = userMessage.toLowerCase().trim()
    const isContactMsg = this.matchesKeywords(lowerMsg, ['contact', 'support', 'phone', 'whatsapp', 'call', 'تواصل', 'دعم', 'اتصال', 'تلفون', 'هاتف', 'رقم'])
    if (isContactMsg) {
      await this.logContactRequest(conversationId)
    }

    const zhipuApiKey = process.env.ZHIPU_API_KEY

    if (zhipuApiKey) {
      try {
        return await this.processMessageWithZhipu(userMessage, language, zhipuApiKey, conversationId)
      } catch (error) {
        console.error('Zhipu AI processing failed, falling back to Gemini/local engine:', error)
      }
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (apiKey) {
      try {
        return await this.processMessageWithGemini(userMessage, language, apiKey, conversationId)
      } catch (error) {
        console.error('Gemini processing failed, falling back to local engine:', error)
      }
    }

    // Default local fallback engine
    return await this.processMessageLocal(userMessage, language, conversationId)
  }

  // 1. Google Gemini AI Engine with Function Calling and Memory
  private async processMessageWithGemini(
    userMessage: string,
    language: 'en' | 'ar',
    apiKey: string,
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const genAI = new GoogleGenerativeAI(apiKey)
    const businessName = await this.getMerchantName()

    // Setup Tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'searchProducts',
            description: 'Search products in the merchant catalog matching a search query.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                query: { type: SchemaType.STRING, description: 'Search term/keyword' },
                merchantId: { type: SchemaType.STRING, description: 'The merchant database UUID' }
              },
              required: ['query', 'merchantId']
            }
          },
          {
            name: 'getProductDetails',
            description: 'Get complete attributes and pricing for a single product UUID.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                productId: { type: SchemaType.STRING, description: 'The product UUID' }
              },
              required: ['productId']
            }
          },
          {
            name: 'getFAQAnswer',
            description: 'Scan merchant FAQs for queries matching delivery options, policies, or questions.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                topic: { type: SchemaType.STRING, description: 'Question/topic keyword' },
                merchantId: { type: SchemaType.STRING, description: 'The merchant database UUID' }
              },
              required: ['topic', 'merchantId']
            }
          },
          {
            name: 'checkWorkingHours',
            description: 'Check store opening hours, closure dates and schedules.',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                merchantId: { type: SchemaType.STRING, description: 'The merchant database UUID' }
              },
              required: ['merchantId']
            }
          }
        ]
      }
    ]

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
      3. Respond concisely (maximum 2-3 sentences) in the same language as the user query.
    `

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      tools: tools as any,
      generationConfig: {
        responseMimeType: 'application/json',
      }
    })

    // Retrieve conversation history
    const history: any[] = []
    if (conversationId) {
      const messagesDb = await this.getConversationHistory(conversationId)
      for (const m of messagesDb) {
        history.push({
          role: m.sender_type === 'bot' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })
      }
    }

    const chat = model.startChat({ history })
    let response = await chat.sendMessage(userMessage)
    let functionCalls = response.response.functionCalls()

    // Loop to handle potential multiple function calls
    let iterations = 0
    while (functionCalls && functionCalls.length > 0 && iterations < 3) {
      iterations++
      const call = functionCalls[0]
      const args = (call.args || {}) as any
      let resultData: any = null

      if (call.name === 'searchProducts') {
        resultData = await searchProducts(args.query as string, args.merchantId as string || this.merchantId)
        const firstProdId = resultData && resultData.length > 0 ? resultData[0].id : null
        await this.logToolCall('searchProducts', { query: args.query }, conversationId, firstProdId)
      } else if (call.name === 'getProductDetails') {
        resultData = await getProductDetails(args.productId as string)
        await this.logToolCall('getProductDetails', { productId: args.productId }, conversationId, args.productId as string)
      } else if (call.name === 'getFAQAnswer') {
        resultData = await getFAQAnswer(args.topic as string, args.merchantId as string || this.merchantId)
        await this.logToolCall('getFAQAnswer', { topic: args.topic }, conversationId, null)
      } else if (call.name === 'checkWorkingHours') {
        resultData = await checkWorkingHours(args.merchantId as string || this.merchantId)
        await this.logToolCall('checkWorkingHours', {}, conversationId, null)
      }

      response = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: { result: resultData }
          }
        }
      ])
      functionCalls = response.response.functionCalls()
    }

    // Parse structured JSON response
    const rawText = response.response.text()
    const parsed = JSON.parse(rawText)

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
      text: parsed.reply,
      type: 'text',
      confident: true,
      quickReplies: [
        { text: "Products Catalog", textAr: "كتالوج المنتجات", action: 'show_menu' },
        { text: "Business Hours", textAr: "مواعيد العمل", action: 'show_hours' }
      ]
    }
  }

  // 1.5. Zhipu AI (GLM) Engine with Function Calling and Memory
  private async processMessageWithZhipu(
    userMessage: string,
    language: 'en' | 'ar',
    apiKey: string,
    conversationId?: string | null
  ): Promise<ChatbotResponse> {
    const OpenAI = (await import('openai')).default
    const zhipuModel = process.env.ZHIPU_MODEL || 'glm-4.7-flash'

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4'
    })

    const businessName = await this.getMerchantName()

    // Setup Tools
    const tools: any[] = [
      {
        type: 'function',
        function: {
          name: 'searchProducts',
          description: 'Search products in the merchant catalog matching a search query keyword.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search term/keyword' },
              merchantId: { type: 'string', description: 'The merchant database UUID' }
            },
            required: ['query', 'merchantId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getProductDetails',
          description: 'Get complete attributes and pricing for a single product UUID.',
          parameters: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'The product UUID' }
            },
            required: ['productId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getFAQAnswer',
          description: 'Scan merchant FAQs for queries matching delivery options, policies, or questions.',
          parameters: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'Question/topic keyword' },
              merchantId: { type: 'string', description: 'The merchant database UUID' }
            },
            required: ['topic', 'merchantId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'checkWorkingHours',
          description: 'Check store opening hours, closure dates and schedules.',
          parameters: {
            type: 'object',
            properties: {
              merchantId: { type: 'string', description: 'The merchant database UUID' }
            },
            required: ['merchantId']
          }
        }
      }
    ]

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
      3. Respond concisely (maximum 2-3 sentences) in the same language as the user query.
    `

    // Build message thread
    const messages: any[] = [
      { role: 'system', content: systemInstruction }
    ]

    // Load memory context
    if (conversationId) {
      const messagesDb = await this.getConversationHistory(conversationId)
      for (const m of messagesDb) {
        messages.push({
          role: m.sender_type === 'bot' ? 'assistant' : 'user',
          content: m.content
        })
      }
    }

    // Add new user query
    messages.push({ role: 'user', content: userMessage })

    // Call Zhipu AI Chat completions endpoint
    let response = await openai.chat.completions.create({
      model: zhipuModel,
      messages,
      tools,
      tool_choice: 'auto',
      response_format: { type: 'json_object' }
    })

    let responseMessage = response.choices[0].message
    let toolCalls = responseMessage.tool_calls

    let iterations = 0
    while (toolCalls && toolCalls.length > 0 && iterations < 3) {
      iterations++
      messages.push(responseMessage)

      for (const toolCall of toolCalls) {
        const tc = toolCall as any
        const callName = tc.function.name
        const callArgs = JSON.parse(tc.function.arguments || '{}')
        let resultData: any = null

        if (callName === 'searchProducts') {
          resultData = await searchProducts(callArgs.query, callArgs.merchantId || this.merchantId)
          const firstProdId = resultData && resultData.length > 0 ? resultData[0].id : null
          await this.logToolCall('searchProducts', { query: callArgs.query }, conversationId, firstProdId)
        } else if (callName === 'getProductDetails') {
          resultData = await getProductDetails(callArgs.productId)
          await this.logToolCall('getProductDetails', { productId: callArgs.productId }, conversationId, callArgs.productId)
        } else if (callName === 'getFAQAnswer') {
          resultData = await getFAQAnswer(callArgs.topic, callArgs.merchantId || this.merchantId)
          await this.logToolCall('getFAQAnswer', { topic: callArgs.topic }, conversationId, null)
        } else if (callName === 'checkWorkingHours') {
          resultData = await checkWorkingHours(callArgs.merchantId || this.merchantId)
          await this.logToolCall('checkWorkingHours', {}, conversationId, null)
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: callName,
          content: JSON.stringify({ result: resultData })
        })
      }

      response = await openai.chat.completions.create({
        model: zhipuModel,
        messages,
        response_format: { type: 'json_object' }
      })
      responseMessage = response.choices[0].message
      toolCalls = responseMessage.tool_calls
    }

    const rawText = responseMessage.content || '{}'
    const parsed = JSON.parse(rawText)

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
      text: parsed.reply,
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
              ? `Here is the product info:\n\n*Product:* ${p.name}\n*Price:* $${p.price}${colorsStr}${sizesStr}\n*Description:* ${p.description || 'No description available.'}`
              : `إليك تفاصيل المنتج:\n\n*المنتج:* ${p.name}\n*السعر:* ${p.price}$${colorsStr}${sizesStr}\n*الوصف:* ${p.description || 'لا يوجد وصف متاح.'}`,
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

    // Log query into unanswered_questions as it is not matched locally
    await this.logUnansweredQuestion(userMessage, conversationId)

    // 5. Fallback Response
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
