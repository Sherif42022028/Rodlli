'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import i18n from '@/lib/i18n/config'

type Language = 'en' | 'ar'

interface I18nContextProps {
  language: Language
  changeLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language
    if (savedLang === 'en' || savedLang === 'ar') {
      setLanguageState(savedLang)
      i18n.changeLanguage(savedLang)
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = savedLang
    } else {
      document.documentElement.dir = 'ltr'
      document.documentElement.lang = 'en'
    }
    setMounted(true)
  }, [])

  const changeLanguage = (lang: Language) => {
    setLanguageState(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let current: unknown = i18n.store.data[language]?.translation
    for (const k of keys) {
      if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    return typeof current === 'string' ? current : key
  }

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t }}>
      <div className={mounted ? "opacity-100 transition-opacity duration-150" : "opacity-0"}>
        {children}
      </div>
    </I18nContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
export type { Language }
