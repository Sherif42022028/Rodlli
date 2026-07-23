'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/components/layout/I18nProvider'
import { MessageSquare, Clock, ArrowRight, Bot } from 'lucide-react'

export default function ChatsClient({
  initialConversations
}: {
  initialConversations: any[]
}) {
  const { language } = useTranslation()
  const [search, setSearch] = useState('')

  const filtered = initialConversations.filter((c) =>
    c.business_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Search Inbox */}
      <div className="max-w-md bg-white border border-dark-100 p-3 rounded-2xl flex items-center gap-2 shadow-sm">
        <span className="text-dark-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'en' ? 'Search conversations...' : 'البحث في المحادثات...'}
          className="flex-1 bg-transparent text-sm text-dark-900 placeholder-dark-400 focus:outline-none"
        />
      </div>

      {/* Conversations Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dark-100 rounded-2xl p-12 text-center text-dark-500">
          <MessageSquare className="w-12 h-12 mx-auto text-dark-300 mb-3" />
          <p className="text-sm font-semibold">
            {language === 'en' ? 'No conversations found.' : 'لا توجد محادثات.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.slug}`}
              className="bg-white border border-dark-100 hover:border-primary-200 hover:shadow-md p-5 rounded-2xl transition-all flex gap-4 items-start cursor-pointer text-left"
            >
              {/* Logo / Avatar */}
              <div className="w-12 h-12 rounded-xl bg-cream-100 border border-dark-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {c.bot_avatar_url ? (
                  <img src={c.bot_avatar_url} alt={c.business_name} className="w-full h-full object-contain p-0.5 bg-white" />
                ) : (
                  <Bot className="w-6 h-6 text-dark-400" />
                )}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className="font-bold text-dark-950 text-sm truncate">{c.business_name}</h4>
                  <span className="text-[10px] text-dark-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.last_message_time 
                      ? new Date(c.last_message_time).toLocaleDateString()
                      : new Date(c.started_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-xs text-dark-600 line-clamp-1 italic mb-3">
                  {c.last_message ? `"${c.last_message}"` : (language === 'en' ? 'Chat started' : 'بدأت المحادثة')}
                </p>

                <span className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors">
                  {language === 'en' ? 'Continue Chatting' : 'متابعة الدردشة'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
