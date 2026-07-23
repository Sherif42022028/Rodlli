'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/components/layout/I18nProvider'
import { queryChatbot } from '@/app/actions/chatbot'
import { getOrCreateConversation, getChatHistory, saveChatMessage, createContactRequest } from '@/app/actions/buyer'
import { 
  Bot, ShoppingBag, Globe, Phone, MapPin, 
  Send, ExternalLink, Calendar, Menu, X, MessageSquare, ArrowLeft 
} from 'lucide-react'

interface Message {
  id: string
  sender: 'bot' | 'user'
  text: string
  type?: 'text' | 'products' | 'hours' | 'faq' | 'link'
  quickReplies?: Array<{
    text: string
    textAr?: string
    action: string
    payload?: any
  }>
  data?: any
  whatsappPhone?: string | null
  whatsappUrl?: string | null
  whatsappQrUrl?: string | null
}

export default function ChatRoomClient({
  merchant,
  products,
  trendingStores,
  buyerId
}: {
  merchant: any
  products: any[]
  trendingStores: any[]
  buyerId: string | null
}) {
  const { language, changeLanguage, t } = useTranslation()

  // Chat State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Layout State
  const [showCatalog, setShowCatalog] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Set initial welcome greeting or load history
  useEffect(() => {
    async function initChat() {
      // 1. Get or generate guestSessionId
      let guestSessionId = localStorage.getItem('guest_session_id')
      if (!guestSessionId) {
        guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 15)
        localStorage.setItem('guest_session_id', guestSessionId)
      }

      // 2. Fetch or create conversation in Neon DB
      const convId = await getOrCreateConversation(
        merchant.id,
        buyerId,
        buyerId ? null : guestSessionId
      )

      if (convId) {
        setConversationId(convId)
        // 3. Get history
        const history = await getChatHistory(convId)
        if (history && history.length > 0) {
          setMessages(history)
        } else {
          // Set initial greeting
          const welcomeText = language === 'en'
            ? `Welcome to ${merchant.business_name}! 👋 Feel free to browse our products or ask any questions.`
            : `مرحباً بك في ${merchant.business_name}! 👋 يمكنك تصفح المنتجات أو سؤالي عن أي استفسار.`
          
          const welcomeMsg: Message = {
            id: 'welcome',
            sender: 'bot',
            text: welcomeText,
            type: 'text'
          }
          setMessages([welcomeMsg])
          // Save welcome message to DB
          await saveChatMessage(convId, 'bot', welcomeText)
        }
      }
    }

    initChat()
  }, [language, merchant.id, merchant.business_name, buyerId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en')
  }

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading || !conversationId) return

    const userMsgId = Math.random().toString()
    const newMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')
    setLoading(true)

    // Save user message to database
    await saveChatMessage(conversationId, 'buyer', textToSend)

    const res = await queryChatbot(textToSend, merchant.id, language, conversationId)
    setLoading(false)

    if (res.response) {
      const botMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: res.response.text,
        type: res.response.type,
        data: res.response.data,
        quickReplies: res.response.quickReplies,
        whatsappPhone: res.response.whatsappPhone,
        whatsappUrl: res.response.whatsappUrl,
        whatsappQrUrl: res.response.whatsappQrUrl,
      }
      setMessages((prev) => [...prev, botMsg])
      // Save bot reply to database with confidence flag
      const isConfident = res.response.confident !== false
      await saveChatMessage(conversationId, 'bot', res.response.text, isConfident)
    } else {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: language === 'en' ? 'Sorry, I failed to process your request.' : 'عذراً، فشل معالجة طلبك.'
      }
      setMessages((prev) => [...prev, errorMsg])
      await saveChatMessage(conversationId, 'bot', errorMsg.text, false)
    }
  }

  // Handle Quick Reply button click
  const handleQuickReply = async (action: string, text: string, payload?: any) => {
    if (action === 'open_url' && payload) {
      window.open(payload, '_blank')
      return
    }
    if (action === 'contact_support' && conversationId) {
      await createContactRequest(merchant.id, conversationId)
    }
    handleSendMessage(text)
  }

  return (
    <div className="h-screen bg-cream-50 text-dark-900 font-sans flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-dark-100 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-500 flex items-center justify-center text-white shadow-md">
            {merchant.bot_avatar_url ? (
              <img src={merchant.bot_avatar_url} alt={merchant.business_name} className="w-full h-full object-contain p-0.5 bg-white" />
            ) : (
              <Bot className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-md font-bold text-dark-950 leading-tight">
              {merchant.business_name}
            </h1>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              {language === 'en' ? 'Online Assistant' : 'المساعد الذكي متصل'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Catalog toggle on mobile */}
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-200 text-xs font-semibold hover:bg-cream-100 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">
              {showCatalog 
                ? (language === 'en' ? 'Hide Catalog' : 'إخفاء المعرض') 
                : (language === 'en' ? 'Show Catalog' : 'عرض المعرض')}
            </span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-200 text-xs font-semibold hover:bg-cream-100 transition-colors"
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Store Catalog */}
        {showCatalog && (
          <aside className="w-full md:w-80 bg-white border-r border-dark-100 flex flex-col overflow-y-auto shrink-0 p-6 absolute md:relative inset-0 md:inset-auto z-20 md:z-auto">
            {/* Mobile close button for Catalog */}
            <div className="flex justify-between items-center mb-6 md:hidden">
              <h3 className="font-bold text-dark-950">Store Details</h3>
              <button onClick={() => setShowCatalog(false)}>
                <X className="w-6 h-6 text-dark-500" />
              </button>
            </div>

            {/* Back to Marketplace */}
            {buyerId && (
              <Link 
                href="/buyer/dashboard"
                className="flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:text-primary-600 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {language === 'en' ? 'Back to Marketplace' : 'الرجوع إلى المتجر'}
              </Link>
            )}

            {/* Store details */}
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-bold text-dark-950 tracking-tight uppercase">
                {language === 'en' ? 'About Business' : 'عن المتجر'}
              </h3>
              <p className="text-xs text-dark-600 leading-relaxed">
                {merchant.short_description || (language === 'en' ? 'Welcome to our store. Browse our catalog below!' : 'مرحباً بك في متجرنا. تصفح كتالوج المنتجات بالأسفل!')}
              </p>

              <div className="space-y-2 text-xs text-dark-700">
                {merchant.store_address && (
                  <div className="flex gap-2 items-center">
                    <MapPin className="w-4 h-4 text-dark-400 shrink-0" />
                    <span>{merchant.store_address}</span>
                  </div>
                )}
                {merchant.business_phone && (
                  <div className="flex gap-2 items-center">
                    <Phone className="w-4 h-4 text-dark-400 shrink-0" />
                    <span>{merchant.business_phone}</span>
                  </div>
                )}
                {merchant.website_url && (
                  <div className="flex gap-2 items-center">
                    <Globe className="w-4 h-4 text-dark-400 shrink-0" />
                    <a href={merchant.website_url} target="_blank" className="text-primary-500 hover:underline flex items-center gap-0.5">
                      Website Link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Product catalog list */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-dark-950 tracking-tight uppercase flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary-500" />
                {language === 'en' ? 'Product Catalog' : 'كتالوج المنتجات'}
              </h3>

              {products.length === 0 ? (
                <p className="text-xs text-dark-500 italic">No products available.</p>
              ) : (
                <div className="space-y-3">
                  {products.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => handleSendMessage(language === 'en' ? `Tell me more about ${p.name}` : `أخبرني أكثر عن ${p.name}`)}
                      className="border border-dark-100 rounded-xl p-3 bg-cream-50/20 hover:bg-primary-50/30 hover:border-primary-200 transition-all cursor-pointer flex gap-3 text-left"
                    >
                      {p.image_urls && p.image_urls.length > 0 && p.image_urls[0] ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-dark-100 bg-white flex items-center justify-center relative">
                          <img 
                            src={p.image_urls[0]} 
                            alt={p.name} 
                            className="w-full h-full object-cover relative z-10" 
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                const placeholder = parent.querySelector('.img-placeholder');
                                if (placeholder) placeholder.classList.remove('hidden');
                              }
                            }}
                          />
                          <div className="img-placeholder absolute inset-0 hidden flex items-center justify-center bg-cream-50 text-dark-500 font-bold text-xs">
                            🛒
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs shrink-0 border border-dark-100">
                          {p.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-0.5">
                          <span className="font-semibold text-xs text-dark-950 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-primary-600 shrink-0">{p.price} ج.م</span>
                        </div>
                        {p.description && <p className="text-[10px] text-dark-500 line-clamp-2">{p.description}</p>}
                        {p.image_urls && p.image_urls.length > 0 && p.image_urls[0] && (
                          <a 
                            href={p.image_urls[0]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-primary-500 hover:underline flex items-center gap-0.5 mt-1 font-bold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {language === 'en' ? 'Product Link' : 'رابط المنتج'}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trending Stores Section */}
            {trendingStores && trendingStores.length > 0 && (
              <div className="space-y-3 mt-8 pt-6 border-t border-dark-100">
                <h3 className="text-sm font-bold text-dark-950 tracking-tight uppercase flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary-500" />
                  {language === 'en' ? 'Trending Stores' : 'المتاجر الرائجة'}
                </h3>
                <div className="space-y-2">
                  {trendingStores.map((ts) => (
                    <Link
                      key={ts.id}
                      href={`/chat/${ts.slug}`}
                      className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-cream-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded overflow-hidden bg-cream-100 border border-dark-100 flex items-center justify-center shrink-0">
                        {ts.bot_avatar_url ? (
                          <img src={ts.bot_avatar_url} alt={ts.business_name} className="w-full h-full object-contain p-0.5 bg-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-dark-400" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-dark-950 truncate flex-1">{ts.business_name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Central/Right Panel: Chat Room */}
        <section className="flex-1 flex flex-col bg-cream-50/50 overflow-hidden relative">
          {/* Message List */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 w-full">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex gap-3 text-sm max-w-[85%] ${
                    m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${
                  m.sender === 'user' ? 'bg-dark-900 text-white' : 'bg-primary-500 text-white'
                }`}>
                  {m.sender === 'user' ? (
                    'ME'
                  ) : merchant.bot_avatar_url ? (
                    <img src={merchant.bot_avatar_url} alt="Bot Avatar" className="w-full h-full object-contain p-0.5 bg-white" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>

                {/* Bubble Container */}
                <div className="space-y-2 max-w-full">
                  <div className={`p-3.5 rounded-2xl w-fit max-w-full ${
                    m.sender === 'user' 
                      ? 'bg-dark-900 text-white rounded-tr-none' 
                      : 'bg-white border border-dark-100 text-dark-950 rounded-tl-none shadow-sm'
                  }`}>
                    <p className="leading-relaxed break-words whitespace-pre-line">{m.text}</p>
                    
                    {/* Bot Dynamic Product Card Result */}
                    {m.sender === 'bot' && m.type === 'products' && m.data && (
                      <div className="mt-3 grid gap-2">
                        {m.data.map((p: any) => (
                          <div 
                            key={p.id} 
                            onClick={() => handleSendMessage(language === 'en' ? `Tell me more about ${p.name}` : `أخبرني أكثر عن ${p.name}`)}
                            className="bg-cream-50 hover:bg-primary-50/50 border border-dark-100 hover:border-primary-200 p-3.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all text-left"
                          >
                            {p.image_urls && p.image_urls.length > 0 && p.image_urls[0] ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-dark-100 bg-white flex items-center justify-center relative">
                                <img 
                                  src={p.image_urls[0]} 
                                  alt={p.name} 
                                  className="w-full h-full object-cover relative z-10" 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      const placeholder = parent.querySelector('.img-placeholder');
                                      if (placeholder) placeholder.classList.remove('hidden');
                                    }
                                  }}
                                />
                                <div className="img-placeholder absolute inset-0 hidden flex items-center justify-center bg-cream-50 text-dark-500 font-bold text-xs">
                                  🛒
                                </div>
                              </div>
                            ) : (
                              <span className="text-lg">🛒</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-xs text-dark-950 truncate">{p.name}</h5>
                              <p className="text-[10px] text-primary-600 font-bold">{p.price} ج.م</p>
                              {p.image_urls && p.image_urls.length > 0 && p.image_urls[0] && (
                                <a 
                                  href={p.image_urls[0]} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-primary-500 hover:underline flex items-center gap-0.5 mt-1 font-bold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {language === 'en' ? 'Product Link' : 'رابط المنتج'}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bot WhatsApp Fallback Contact Card */}
                    {m.sender === 'bot' && (m.whatsappUrl || m.whatsappQrUrl) && (
                      <div className="mt-3 bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl space-y-3 text-emerald-950 text-left">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold">
                            {language === 'en' ? 'Connect directly on WhatsApp' : 'التواصل المباشر عبر الواتساب'}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          {language === 'en' 
                            ? 'Click the button below or scan the QR code to chat with the store team directly.' 
                            : 'يمكنك المحادثة مباشرة مع فريق متجرنا عبر الواتساب بالضغط على الزر أو مسح الكود بالموبايل:'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                          {m.whatsappUrl && (
                            <a
                              href={m.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {language === 'en' ? 'Open WhatsApp Chat 💬' : 'فتح محادثة الواتساب 💬'}
                            </a>
                          )}
                          {m.whatsappQrUrl && (
                            <div className="bg-white border border-emerald-200 p-1.5 rounded-xl shadow-xs text-center shrink-0">
                              <img src={m.whatsappQrUrl} alt="WhatsApp QR Code" className="w-20 h-20 object-contain mx-auto" />
                              <span className="text-[9px] text-dark-500 font-semibold block mt-0.5">
                                {language === 'en' ? 'Scan with Phone' : 'امسح بالموبايل'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking Indicator */}
            {loading && (
              <div className="flex gap-3 text-sm mr-auto items-center">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary-500 text-white flex items-center justify-center shadow-sm">
                  {merchant.bot_avatar_url ? (
                    <img src={merchant.bot_avatar_url} alt="Bot Avatar" className="w-full h-full object-contain p-0.5 bg-white" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>
                <div className="bg-white border border-dark-100 text-dark-600 p-3 rounded-2xl rounded-bl-none flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-dark-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-dark-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-dark-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

          {/* Quick Replies Panel */}
          {messages.length > 0 && messages[messages.length - 1].sender === 'bot' && messages[messages.length - 1].quickReplies && (
            <div className="px-6 py-2 shrink-0 z-10">
              <div className="max-w-5xl mx-auto w-full flex flex-wrap gap-2 justify-center">
                {messages[messages.length - 1].quickReplies?.map((qr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(qr.action, language === 'en' ? qr.text : (qr.textAr || qr.text), qr.payload)}
                    className="px-3.5 py-1.5 rounded-full border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    {language === 'en' ? qr.text : (qr.textAr || qr.text)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-4 bg-white border-t border-dark-100 shrink-0">
            <div className="max-w-5xl mx-auto w-full flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder={language === 'en' ? 'Type your message...' : 'اكتب رسالتك هنا...'}
                className="flex-1 px-4 py-3 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-cream-50/20"
              />
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || loading}
                className="px-5 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-dark-100 disabled:text-dark-400 text-white font-bold text-sm transition-colors flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
