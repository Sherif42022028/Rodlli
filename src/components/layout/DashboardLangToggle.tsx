'use client'

import React from 'react'
import { useTranslation } from '@/components/layout/I18nProvider'
import { Globe } from 'lucide-react'

export default function DashboardLangToggle() {
  const { language, changeLanguage } = useTranslation()

  const toggleLang = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en')
  }

  return (
    <button
      onClick={toggleLang}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-100 text-dark-700 hover:text-dark-950 transition-colors text-sm font-semibold"
    >
      <Globe className="w-4.5 h-4.5 text-dark-500" />
      <span>{language === 'en' ? 'العربية (Arabic)' : 'English'}</span>
    </button>
  )
}
