'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/components/layout/I18nProvider'
import { queryChatbot } from '@/app/actions/chatbot'
import { getOrCreateConversation, getChatHistory, saveChatMessage } from '@/app/actions/buyer'
import { Bot, Send, Globe, X, ExternalLink } from 'lucide-react'

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
}

export default function WidgetChatRoomClient({
  merchant,
  products,
  buyerId
}: {
  merchant: any
  products: any[]
  buyerId: string | null
}) {
  const { language, changeLanguage, t } = useTranslation()

  // Chat State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize Chat and Load History
  useEffect(() => {
    async function initChat() {
      let guestSessionId = localStorage.getItem('guest_session_id')
      if (!guestSessionId) {
        guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 15)
        localStorage.setItem('guest_session_id', guestSessionId)
      }

      const convId = await getOrCreateConversation(
        merchant.id,
        buyerId,
        buyerId ? null : guestSessionId
      )

      if (convId) {
        setConversationId(convId)
        const history = await getChatHistory(convId)
        if (history && history.length > 0) {
          setMessages(history)
        } else {
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
        data: res.response.data
      }
      setMessages((prev) => [...prev, botMsg])
      await saveChatMessage(conversationId, 'bot', res.response.text)
    } else {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: 'bot',
        text: language === 'en' ? 'Sorry, I failed to process your request.' : 'عذراً، فشل معالجة طلبك.'
      }
      setMessages((prev) => [...prev, errorMsg])
      await saveChatMessage(conversationId, 'bot', errorMsg.text)
    }
  }

  const handleCloseWidget = () => {
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage('rodlli_close_widget', '*')
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-cream-50/30 overflow-hidden font-sans">
      {/* Widget Header */}
      <header className="h-14 bg-white border-b border-dark-100 flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg overflow-hidden border border-dark-100 bg-cream-100 flex items-center justify-center shrink-0">
            {merchant.bot_avatar_url ? (
              <img src={merchant.bot_avatar_url} alt="Bot Avatar" className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-5 h-5 text-dark-500" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-dark-950 truncate leading-none mb-0.5">{merchant.business_name}</h4>
            <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              {language === 'en' ? 'Online Assistant' : 'مساعد متصل'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 p-1.5 rounded-lg border border-dark-200 text-[10px] font-bold hover:bg-cream-100 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === 'en' ? 'AR' : 'EN'}
          </button>

          {/* Close button for Mobile inside frame */}
          <button
            onClick={handleCloseWidget}
            className="p-1.5 rounded-lg border border-dark-200 text-dark-500 hover:text-dark-950 hover:bg-cream-100 transition-colors sm:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex gap-2 text-xs max-w-[85%] ${
              m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div className={`w-6 h-6 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${
              m.sender === 'user' ? 'bg-dark-900 text-white' : 'bg-primary-500 text-white'
            }`}>
              {m.sender === 'user' ? (
                <span className="text-[8px] font-bold">ME</span>
              ) : merchant.bot_avatar_url ? (
                <img src={merchant.bot_avatar_url} alt="Bot Avatar" className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Bubble */}
            <div className="space-y-1.5">
              <div className={`p-3 rounded-xl ${
                m.sender === 'user' 
                  ? 'bg-dark-900 text-white rounded-tr-none' 
                  : 'bg-white border border-dark-100 text-dark-950 rounded-tl-none shadow-sm'
              }`}>
                <p className="leading-relaxed break-words whitespace-pre-line text-xs">{m.text}</p>
                
                {/* Bot Dynamic Product Card Result */}
                {m.sender === 'bot' && m.type === 'products' && m.data && (
                  <div className="mt-2.5 grid gap-2">
                    {m.data.map((p: any) => (
                      <div 
                        key={p.id} 
                        onClick={() => handleSendMessage(language === 'en' ? `Tell me more about ${p.name}` : `أخبرني أكثر عن ${p.name}`)}
                        className="bg-cream-50 hover:bg-primary-50/50 border border-dark-100 hover:border-primary-200 p-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all text-left"
                      >
                        {p.image_urls && p.image_urls.length > 0 && p.image_urls[0] ? (
                          <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-dark-100 bg-white">
                            <img src={p.image_urls[0]} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-md">🛒</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-[10px] text-dark-950 truncate">{p.name}</h5>
                          <p className="text-[9px] text-primary-600 font-bold">${p.price}</p>
                          {p.image_urls && p.image_urls.length > 0 && p.image_urls[0] && (
                            <a 
                              href={p.image_urls[0]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[8px] text-primary-500 hover:underline flex items-center gap-0.5 mt-0.5 font-bold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {language === 'en' ? 'Product Link' : 'رابط المنتج'}
                              <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bot Quick Replies */}
              {m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.quickReplies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(language === 'en' ? qr.text : (qr.textAr || qr.text))}
                      className="px-2.5 py-1 rounded-full border border-primary-200 hover:border-primary-300 hover:bg-primary-50 text-[10px] font-semibold text-primary-600 transition-all text-left"
                    >
                      {language === 'en' ? qr.text : (qr.textAr || qr.text)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center text-xs text-dark-500 italic px-8">
            <span className="w-1.5 h-1.5 rounded-full bg-dark-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-dark-400 animate-bounce delay-100" />
            <span className="w-1.5 h-1.5 rounded-full bg-dark-400 animate-bounce delay-200" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message panel */}
      <footer className="p-3 bg-white border-t border-dark-100 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage(inputText)
          }}
          className="flex items-center gap-2 bg-cream-50/50 border border-dark-100 rounded-xl px-3 py-1.5"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={language === 'en' ? 'Type a message...' : 'اكتب رسالة...'}
            className="flex-1 bg-transparent text-xs text-dark-900 placeholder-dark-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-7 h-7 rounded-lg bg-primary-500 hover:bg-primary-600 disabled:bg-dark-100 disabled:text-dark-400 flex items-center justify-center text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </div>
  )
}
