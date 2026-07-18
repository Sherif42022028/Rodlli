'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '@/components/layout/I18nProvider'
import { Bot, LineChart, Globe, RefreshCw, ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react'

export default function Home() {
  const { language, changeLanguage, t } = useTranslation()

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en')
  }

  return (
    <div className={`min-h-screen bg-cream-50 text-dark-900 font-sans selection:bg-primary-500 selection:text-white`}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-cream-50/80 border-b border-dark-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-dark-900 via-primary-600 to-primary-500 bg-clip-text text-transparent">
              Rodlli
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-dark-700">
            <Link href="/" className="hover:text-primary-500 transition-colors">
              {t('nav.home')}
            </Link>
            <a href="#features" className="hover:text-primary-500 transition-colors">
              {language === 'en' ? 'Features' : 'المميزات'}
            </a>
            <a href="#pricing" className="hover:text-primary-500 transition-colors">
              {t('nav.pricing')}
            </a>
            <a href="#contact" className="hover:text-primary-500 transition-colors">
              {t('nav.contact')}
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-200 text-xs font-semibold bg-white hover:bg-cream-100 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'en' ? 'العربية' : 'English'}
            </button>

            <Link
              href="/login"
              className="text-sm font-semibold text-dark-700 hover:text-primary-500 transition-colors hidden sm:block"
            >
              {t('nav.signUp')}
            </Link>

            <Link
              href="/register"
              className="bg-dark-900 text-white hover:bg-dark-800 transition-colors text-sm font-semibold rounded-xl px-5 py-2.5 shadow-sm flex items-center gap-1"
            >
              {t('hero.cta')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-primary-100/20 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-200 bg-primary-50 text-primary-700 text-xs font-semibold mb-6 animate-pulse">
            <Zap className="w-3.5 h-3.5" />
            {language === 'en' ? 'Next-Gen E-Commerce Chatbots' : 'شات بوت متطور للتجارة الإلكترونية'}
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-dark-950 max-w-4xl mx-auto leading-[1.1] mb-6">
            {t('hero.title')}
          </h1>

          <p className="text-lg sm:text-xl text-dark-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl px-8 py-4 shadow-lg shadow-primary-500/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] flex items-center justify-center gap-2"
            >
              {t('hero.cta')}
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="#demo"
              className="w-full sm:w-auto bg-white border border-dark-200 hover:bg-cream-100 text-dark-900 font-bold rounded-xl px-8 py-4 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {t('hero.demo')}
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white border-y border-dark-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-dark-950 mb-4">
              {language === 'en' ? 'Everything you need to automate conversations' : 'كل ما تحتاجه لأتمتة محادثات عملائك'}
            </h2>
            <p className="text-dark-600">
              {language === 'en' 
                ? 'Supercharge your store with immediate automated answers, product lookup, and customer integrations.' 
                : 'ادعم متجرك بردود فورية مؤتمتة، والبحث عن المنتجات، وربط مخصص لعملائك.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-dark-100 bg-cream-50 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-dark-950 mb-2">
                {language === 'en' ? 'Rule-Based Engine' : 'محرك الرد القائم على القواعد'}
              </h3>
              <p className="text-sm text-dark-600 leading-relaxed">
                {language === 'en'
                  ? 'Define keywords and dynamic triggers for instant answers with zero AI hallucination.'
                  : 'حدد الكلمات المفتاحية ومحفزات الرد التفاعلية لردود فورية وموثوقة بنسبة 100%.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-dark-100 bg-cream-50 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-dark-950 mb-2">
                {language === 'en' ? 'Google Sheets Sync' : 'مزامنة جوجل شيت'}
              </h3>
              <p className="text-sm text-dark-600 leading-relaxed">
                {language === 'en'
                  ? 'Sync products, pricing, and stock status dynamically directly from a Google spreadsheet.'
                  : 'حدّث المنتجات والأسعار وحالة المخزون بشكل تفاعلي ومباشر من جداول بيانات جوجل.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-dark-100 bg-cream-50 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-dark-950 mb-2">
                {language === 'en' ? 'Arabic & English' : 'دعم العربية والإنجليزية'}
              </h3>
              <p className="text-sm text-dark-600 leading-relaxed">
                {language === 'en'
                  ? 'Provide shopping experiences in English and Arabic with automated translation.'
                  : 'قدم تجربة تسوق كاملة باللغتين العربية والإنجليزية مع دعم كامل لاتجاهات الصفحة RTL/LTR.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-dark-100 bg-cream-50 hover:shadow-md transition-shadow duration-200">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-dark-950 mb-2">
                {language === 'en' ? 'Detailed Analytics' : 'تحليلات تفصيلية'}
              </h3>
              <p className="text-sm text-dark-600 leading-relaxed">
                {language === 'en'
                  ? 'Track metrics, chat counts, link clicks, and product lookups on your merchant dashboard.'
                  : 'تتبع المقاييس، وعدد المحادثات، والضغط على الروابط والمنتجات الأكثر طلباً في لوحة تحكم التاجر.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section id="demo" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-dark-950 mb-6 leading-tight">
                {language === 'en'
                  ? 'Interactive shopping chatbots that convert visitors into buyers'
                  : 'شات بوت تفاعلي يحول زوار متجرك إلى مشترين فعليين'}
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center mt-1">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div>
                    <h4 className="font-bold text-dark-950">
                      {language === 'en' ? 'Safe and Secure' : 'آمن وموثوق'}
                    </h4>
                    <p className="text-sm text-dark-600">
                      {language === 'en' 
                        ? 'Built using Supabase authentication and strict Row-Level Security (RLS) data rules.' 
                        : 'مبني باستخدام نظام صلاحيات Supabase وقواعد أمان صارمة RLS لحماية بياناتك.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center mt-1">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <div>
                    <h4 className="font-bold text-dark-950">
                      {language === 'en' ? 'Quick Share Link' : 'رابط مشاركة سريع'}
                    </h4>
                    <p className="text-sm text-dark-600">
                      {language === 'en'
                        ? 'Every merchant gets a unique storefront slug (e.g. /chat/mystore) to share on social media.'
                        : 'يحصل كل تاجر على رابط فريد ومخصص لمتجره (مثل chat/mystore/) لمشاركته على منصات التواصل.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Chat Demo Mockup */}
            <div className="bg-dark-900 rounded-3xl p-4 shadow-xl border border-dark-800">
              <div className="bg-cream-100 rounded-2xl overflow-hidden aspect-[4/3] flex flex-col">
                <div className="bg-white border-b border-dark-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-dark-950">Rodlli Bot</h4>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                        {t('chat.online')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center text-primary-600 text-[10px]">
                      Bot
                    </div>
                    <div className="bg-cream-200 text-dark-900 px-3 py-2 rounded-2xl rounded-bl-none max-w-[70%]">
                      {language === 'en' 
                        ? 'Welcome to SmartStore! How can I assist you today?' 
                        : 'مرحباً بك في متجرنا الذكي! كيف يمكنني مساعدتك اليوم؟'}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <div className="bg-dark-900 text-white px-3 py-2 rounded-2xl rounded-br-none max-w-[70%]">
                      {language === 'en' ? 'Show Today\'s Menu' : 'اعرض قائمة اليوم'}
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center text-primary-600 text-[10px]">
                      Bot
                    </div>
                    <div className="bg-cream-200 text-dark-900 px-3 py-2 rounded-2xl rounded-bl-none max-w-[70%] space-y-2">
                      <p>{language === 'en' ? 'Here are our products:' : 'إليك منتجاتنا المتوفرة:'}</p>
                      <div className="bg-white border border-dark-100 rounded-lg p-2 flex items-center gap-2">
                        <div className="w-10 h-10 rounded bg-primary-100 flex items-center justify-center text-primary-500 font-bold">🛒</div>
                        <div>
                          <p className="font-bold text-dark-950">Latte Coffee</p>
                          <p className="text-[10px] text-primary-600 font-semibold">$4.50</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-t border-dark-100 p-3 flex gap-2">
                  <input
                    type="text"
                    placeholder={t('chat.placeholder')}
                    disabled
                    className="flex-1 bg-cream-50 border border-dark-200 rounded-lg px-3 text-xs focus:outline-none"
                  />
                  <button className="bg-dark-900 text-white rounded-lg px-4 text-xs font-semibold py-2">
                    {language === 'en' ? 'Send' : 'إرسال'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-950 text-dark-400 py-12 border-t border-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Rodlli</span>
          </div>

          <p className="text-center md:text-left">
            © {new Date().getFullYear()} Rodlli. All rights reserved.
          </p>

          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
