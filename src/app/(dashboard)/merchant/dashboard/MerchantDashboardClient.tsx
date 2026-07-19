'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/layout/I18nProvider'
import { upsertMerchant, addProduct, deleteProduct, addFAQ, deleteFAQ, updateWorkingHours, resolveUnansweredQuestion } from '@/app/actions/merchant'
import { getAnalyticsTrend } from '@/app/actions/analytics'
import { 
  Store, ShoppingBag, HelpCircle, Clock, Link2, Copy, ExternalLink, 
  Trash2, Plus, Edit2, Check, AlertCircle, RefreshCw, MessageSquareWarning,
  BarChart3, TrendingUp, MessageSquare, Percent
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function MerchantDashboardClient({
  merchant,
  initialProducts,
  initialFAQs,
  initialHours,
  initialUnanswered,
  analyticsOverview,
  analyticsTrend,
  analyticsTopProducts,
  analyticsTopQuestions,
  analyticsConversion
}: {
  merchant: any
  initialProducts: any[]
  initialFAQs: any[]
  initialHours: any[]
  initialUnanswered: any[]
  analyticsOverview: any
  analyticsTrend: any[]
  analyticsTopProducts: any[]
  analyticsTopQuestions: any[]
  analyticsConversion: any
}) {
  const { language, t } = useTranslation()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'faq' | 'hours' | 'link' | 'unanswered' | 'analytics'>('info')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [pendingResolveId, setPendingResolveId] = useState<string | null>(null)

  // Analytics states
  const [trendRange, setTrendRange] = useState<'7d' | '30d'>('7d')
  const [trendData, setTrendData] = useState(analyticsTrend)
  const [loadingTrend, setLoadingTrend] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchNewTrend() {
      setLoadingTrend(true)
      const data = await getAnalyticsTrend(merchant.id, trendRange)
      setTrendData(data)
      setLoadingTrend(false)
    }
    
    if (trendRange === '30d') {
      fetchNewTrend()
    } else {
      setTrendData(analyticsTrend)
    }
  }, [trendRange, merchant.id, analyticsTrend])

  // 1. Store Info Edit State
  const [editMode, setEditMode] = useState(false)
  const [businessName, setBusinessName] = useState(merchant.business_name || '')
  const [businessCategory, setBusinessCategory] = useState(merchant.business_category || '')
  const [shortDescription, setShortDescription] = useState(merchant.short_description || '')
  const [storeAddress, setStoreAddress] = useState(merchant.store_address || '')
  const [businessPhone, setBusinessPhone] = useState(merchant.business_phone || '')
  const [websiteUrl, setWebsiteUrl] = useState(merchant.website_url || '')
  const [botAvatarUrl, setBotAvatarUrl] = useState(merchant.bot_avatar_url || '')

  // 2. Add Product State
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [pName, setPName] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pDescription, setPDescription] = useState('')
  const [pImageUrl, setPImageUrl] = useState('')

  // 3. Add FAQ State
  const [showAddFAQ, setShowAddFAQ] = useState(false)
  const [faqQuestion, setFaqQuestion] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')

  // 4. Working Hours State
  const daysOfWeek = [
    { num: 0, nameEn: 'Sunday', nameAr: 'الأحد' },
    { num: 1, nameEn: 'Monday', nameAr: 'الإثنين' },
    { num: 2, nameEn: 'Tuesday', nameAr: 'الثلاثاء' },
    { num: 3, nameEn: 'Wednesday', nameAr: 'الأربعاء' },
    { num: 4, nameEn: 'Thursday', nameAr: 'الخميس' },
    { num: 5, nameEn: 'Friday', nameAr: 'الجمعة' },
    { num: 6, nameEn: 'Saturday', nameAr: 'السبت' },
  ]
  const [hours, setHours] = useState<any[]>(
    daysOfWeek.map((day) => {
      const match = initialHours.find((h) => h.day_of_week === day.num)
      return {
        day_of_week: day.num,
        nameEn: day.nameEn,
        nameAr: day.nameAr,
        open_time: match?.open_time || '09:00',
        close_time: match?.close_time || '18:00',
        is_closed: match ? match.is_closed : false
      }
    })
  )

  const showMessage = (success: string | null, error: string | null) => {
    setSuccessMsg(success)
    setErrorMsg(error)
    setTimeout(() => {
      setSuccessMsg(null)
      setErrorMsg(null)
    }, 4000)
  }

  // Handlers
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await upsertMerchant(
      {
        businessName,
        businessCategory,
        shortDescription,
        storeAddress,
        businessPhone,
        websiteUrl,
        botAvatarUrl,
      },
      merchant.profile_id
    )
    setLoading(false)
    if (res.error) {
      showMessage(null, res.error)
    } else {
      setEditMode(false)
      showMessage(
        language === 'en' ? 'Store details updated successfully' : 'تم تحديث تفاصيل المتجر بنجاح',
        null
      )
      router.refresh()
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const priceFloat = parseFloat(pPrice)
    const res = await addProduct(
      {
        name: pName,
        price: priceFloat,
        description: pDescription,
        imageUrls: pImageUrl ? [pImageUrl] : []
      },
      merchant.id
    )
    setLoading(false)
    if (res.error) {
      showMessage(null, res.error)
    } else {
      setPName('')
      setPPrice('')
      setPDescription('')
      setPImageUrl('')
      setShowAddProduct(false)
      showMessage(
        language === 'en' ? 'Product added successfully' : 'تم إضافة المنتج بنجاح',
        null
      )
      router.refresh()
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟')) return
    const res = await deleteProduct(id)
    if (res.error) {
      showMessage(null, res.error)
    } else {
      showMessage(
        language === 'en' ? 'Product deleted' : 'تم حذف المنتج',
        null
      )
      router.refresh()
    }
  }

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await addFAQ(
      {
        question: faqQuestion,
        answer: faqAnswer,
        orderIndex: initialFAQs.length
      },
      merchant.id
    )
    setLoading(false)
    if (res.error) {
      showMessage(null, res.error)
    } else {
      if (pendingResolveId) {
        await resolveUnansweredQuestion(pendingResolveId)
        setPendingResolveId(null)
      }
      setFaqQuestion('')
      setFaqAnswer('')
      setShowAddFAQ(false)
      showMessage(
        language === 'en' ? 'FAQ added successfully' : 'تم إضافة السؤال الشائع بنجاح',
        null
      )
      router.refresh()
    }
  }

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟')) return
    const res = await deleteFAQ(id)
    if (res.error) {
      showMessage(null, res.error)
    } else {
      showMessage(
        language === 'en' ? 'FAQ deleted' : 'تم حذف السؤال',
        null
      )
      router.refresh()
    }
  }

  const handleSaveHours = async () => {
    setLoading(true)
    const res = await updateWorkingHours(merchant.id, hours)
    setLoading(false)
    if (res.error) {
      showMessage(null, res.error)
    } else {
      showMessage(
        language === 'en' ? 'Working hours saved successfully' : 'تم حفظ ساعات العمل بنجاح',
        null
      )
      router.refresh()
    }
  }

  const copyChatbotLink = () => {
    const fullLink = `${window.location.origin}/chat/${merchant.slug}`
    navigator.clipboard.writeText(fullLink)
    showMessage(
      language === 'en' ? 'Chatbot link copied!' : 'تم نسخ رابط الشات بوت!',
      null
    )
  }

  const copyEmbedCode = () => {
    const code = `<script src="${window.location.origin}/widget.js" data-merchant="${merchant.slug}" async></script>`
    navigator.clipboard.writeText(code)
    showMessage(
      language === 'en' ? 'Embed code copied!' : 'تم نسخ كود التضمين!',
      null
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex flex-wrap gap-2 border-b border-dark-100 pb-2">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'info' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <Store className="w-4 h-4" />
          {language === 'en' ? 'Store Info' : 'بيانات المتجر'}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'analytics' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {language === 'en' ? 'Analytics' : 'التحليلات'}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'products' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {language === 'en' ? 'Products' : 'المنتجات'}
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'faq' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          {language === 'en' ? 'FAQs' : 'الأسئلة الشائعة'}
        </button>

        <button
          onClick={() => setActiveTab('hours')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'hours' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          {language === 'en' ? 'Hours' : 'ساعات العمل'}
        </button>

        <button
          onClick={() => setActiveTab('link')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'link' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <Link2 className="w-4 h-4" />
          {language === 'en' ? 'Chatbot Link' : 'رابط الشات بوت'}
        </button>

        <button
          onClick={() => setActiveTab('unanswered')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'unanswered' ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-cream-100 text-dark-600'
          }`}
        >
          <MessageSquareWarning className="w-4 h-4" />
          {language === 'en' ? 'Unanswered Questions' : 'أسئلة معلقة'}
          {initialUnanswered.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold animate-pulse">
              {initialUnanswered.length}
            </span>
          )}
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-2 text-sm">
          <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="bg-white rounded-3xl border border-dark-100 p-6 md:p-8 shadow-sm">
        {/* Tab: Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h3 className="text-lg font-bold text-dark-950">
                {language === 'en' ? 'Analytics & Performance' : 'التحليلات ومؤشرات الأداء'}
              </h3>
              <p className="text-xs text-dark-600 mt-1">
                {language === 'en' 
                  ? 'Track your smart assistant responses, customer conversions, and catalog trends.'
                  : 'تتبع استجابات المساعد الذكي، ومعدلات تحويل العملاء، واهتماماتهم بالمنتجات.'}
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Chats */}
              <div className="bg-cream-50/50 p-4 border border-dark-100 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-dark-500 font-bold block uppercase tracking-wider">
                    {language === 'en' ? "Conversations Today" : "محادثات اليوم"}
                  </span>
                  <span className="text-lg font-extrabold text-dark-950 block mt-0.5">
                    {analyticsOverview.conversationsToday}
                  </span>
                </div>
              </div>

              {/* Card 2: Today's Messages */}
              <div className="bg-cream-50/50 p-4 border border-dark-100 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dark-50 flex items-center justify-center text-dark-600 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-dark-500 font-bold block uppercase tracking-wider">
                    {language === 'en' ? "Messages Today" : "رسائل اليوم"}
                  </span>
                  <span className="text-lg font-extrabold text-dark-950 block mt-0.5">
                    {analyticsOverview.messagesToday}
                  </span>
                </div>
              </div>

              {/* Card 3: AI Response Rate */}
              {/* AI Response Rate is defined as: confident: true bot responses / total bot responses */}
              <div className="bg-cream-50/50 p-4 border border-dark-100 rounded-2xl flex items-center gap-3" title={language === 'en' ? "Percentage of AI automated responses answered with confidence" : "نسبة ردود البوت التلقائية التي تمت الإجابة عليها بثقة"}>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-dark-500 font-bold block uppercase tracking-wider">
                    {language === 'en' ? "AI Response Rate" : "نسبة الرد الذكي"}
                  </span>
                  <span className="text-lg font-extrabold text-dark-950 block mt-0.5">
                    {(analyticsOverview.responseRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Card 4: Unanswered Questions */}
              <div className="bg-cream-50/50 p-4 border border-dark-100 rounded-2xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${analyticsOverview.unansweredCount > 0 ? 'bg-red-50 text-red-500' : 'bg-cream-100 text-dark-400'} flex items-center justify-center shrink-0`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-dark-500 font-bold block uppercase tracking-wider">
                    {language === 'en' ? "Unanswered Count" : "أسئلة معلقة"}
                  </span>
                  <span className={`text-lg font-extrabold block mt-0.5 ${analyticsOverview.unansweredCount > 0 ? 'text-red-500 animate-pulse' : 'text-dark-950'}`}>
                    {analyticsOverview.unansweredCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Trend Chart & Conversion Rate */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Trend Chart Card */}
              <div className="lg:col-span-2 border border-dark-100 p-5 rounded-3xl bg-white space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-dark-950 text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary-500" />
                    {language === 'en' ? 'Conversation Trend' : 'مخطط النشاط اليومي'}
                  </h4>

                  {/* Toggle 7d / 30d */}
                  <div className="flex border border-dark-100 rounded-lg p-0.5 text-xs bg-cream-50">
                    <button
                      onClick={() => setTrendRange('7d')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        trendRange === '7d' ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-505'
                      }`}
                    >
                      {language === 'en' ? '7 Days' : '٧ أيام'}
                    </button>
                    <button
                      onClick={() => setTrendRange('30d')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        trendRange === '30d' ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-500'
                      }`}
                    >
                      {language === 'en' ? '30 Days' : '٣٠ يوم'}
                    </button>
                  </div>
                </div>

                {/* Line Chart Render */}
                <div className="relative h-[240px]">
                  {loadingTrend && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-semibold text-dark-500 z-10">
                      {language === 'en' ? 'Loading trend...' : 'جاري التحميل...'}
                    </div>
                  )}

                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F26B1D" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#F26B1D" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F0EB"/>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#737373' }}/>
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#737373' }} allowDecimals={false}/>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #D9D9D9', background: '#FAF8F5' }}/>
                        <Area type="monotone" dataKey="conversations" stroke="#F26B1D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConversations)" name={language === 'en' ? 'Conversations' : 'المحادثات'}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-dark-400">Loading chart...</div>
                  )}
                </div>
              </div>

              {/* Conversion Rate Card */}
              <div className="border border-dark-100 p-5 rounded-3xl bg-white flex flex-col justify-between items-center text-center space-y-4">
                <div className="w-full text-left">
                  <h4 className="font-bold text-dark-950 text-sm flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-500" />
                    {language === 'en' ? 'Support Conversions' : 'معدل التحويل للاتصال بالدعم'}
                  </h4>
                  <p className="text-[10px] text-dark-505 mt-1">
                    {language === 'en' 
                      ? 'The percentage of chatbot interactions that resulted in a support request.'
                      : 'نسبة محادثات البوت التي تحولت إلى طلبات تواصل أو استفسارات دعم.'}
                  </p>
                </div>

                {/* Big Visual conversion rate */}
                <div className="relative flex items-center justify-center py-6">
                  {/* Decorative outer glow circles */}
                  <div className="absolute w-32 h-32 rounded-full border border-dashed border-emerald-200 animate-spin" style={{ animationDuration: '30s' }} />
                  <div className="absolute w-28 h-28 rounded-full border border-emerald-100" />
                  
                  <div className="w-24 h-24 rounded-full bg-emerald-50/50 flex flex-col items-center justify-center border border-emerald-200 shadow-inner">
                    <span className="text-xl font-extrabold text-emerald-600 leading-none">
                      {(analyticsConversion.conversionRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-1 bg-cream-50 border border-dark-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-dark-600 block uppercase">
                    {language === 'en' ? 'Conversion Metrics' : 'مؤشرات التحويل'}
                  </span>
                  <span className="text-xs font-semibold text-dark-900 block mt-1">
                    {language === 'en' 
                      ? `${analyticsConversion.contacts} support requests out of ${analyticsConversion.totalConvs} chats`
                      : `${analyticsConversion.contacts} طلب تواصل من إجمالي ${analyticsConversion.totalConvs} محادثة`}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Products & Top Questions */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Products Asked About */}
              <div className="border border-dark-100 p-5 rounded-3xl bg-white space-y-4">
                <h4 className="font-bold text-dark-950 text-sm flex items-center gap-1.5 border-b border-dark-50 pb-2.5">
                  <ShoppingBag className="w-4.5 h-4.5 text-primary-500" />
                  {language === 'en' ? 'Top Asked Products (5)' : 'أكثر المنتجات تكراراً في الأسئلة (٥)'}
                </h4>

                {analyticsTopProducts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-dark-500 italic">
                    {language === 'en' ? 'No product query logs found yet.' : 'لا توجد بيانات مسجلة لأسئلة المنتجات بعد.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyticsTopProducts.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <span className="w-5 h-5 rounded bg-primary-50 text-primary-600 font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-dark-800 truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 bg-cream-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            {/* Visual indicator bar */}
                            <div className="bg-primary-500 h-full" style={{ width: `${Math.min(100, (p.count / (analyticsTopProducts[0]?.count || 1)) * 100)}%` }} />
                          </div>
                          <span className="font-bold text-dark-900 bg-cream-50 px-2 py-0.5 rounded-full">{p.count} {language === 'en' ? 'queries' : 'سؤال'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top FAQ Questions Asked */}
              <div className="border border-dark-100 p-5 rounded-3xl bg-white space-y-4">
                <h4 className="font-bold text-dark-950 text-sm flex items-center gap-1.5 border-b border-dark-50 pb-2.5">
                  <HelpCircle className="w-4.5 h-4.5 text-primary-500" />
                  {language === 'en' ? 'Top Asked Topics & FAQs (5)' : 'أكثر الأسئلة والمواضيع طرحاً (٥)'}
                </h4>

                {analyticsTopQuestions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-dark-500 italic">
                    {language === 'en' ? 'No FAQ match logs found yet.' : 'لا توجد بيانات مسجلة لاستفسارات الأسئلة الشائعة بعد.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analyticsTopQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <span className="w-5 h-5 rounded bg-dark-50 text-dark-600 font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-dark-800 truncate capitalize">&quot;{q.question}&quot;</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 bg-cream-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="bg-dark-600 h-full" style={{ width: `${Math.min(100, (q.count / (analyticsTopQuestions[0]?.count || 1)) * 100)}%` }} />
                          </div>
                          <span className="font-bold text-dark-900 bg-cream-50 px-2 py-0.5 rounded-full">{q.count} {language === 'en' ? 'times' : 'مرة'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Store Info */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-dark-950">
                {language === 'en' ? 'Business Information' : 'بيانات النشاط التجاري'}
              </h3>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Edit Details' : 'تعديل البيانات'}
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSaveInfo} className="space-y-4 max-w-xl">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-700 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Short Description</label>
                  <textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Store Address</label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Bot Icon Image URL (رابط صورة أيقونة البوت)</label>
                  <input
                    type="url"
                    value={botAvatarUrl}
                    onChange={(e) => setBotAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    placeholder="https://example.com/bot-avatar.png"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-dark-900 hover:bg-dark-800 text-white rounded-xl text-xs font-bold"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false)
                      // reset values
                      setBusinessName(merchant.business_name)
                      setBusinessCategory(merchant.business_category)
                      setShortDescription(merchant.short_description || '')
                      setStoreAddress(merchant.store_address || '')
                      setBusinessPhone(merchant.business_phone || '')
                      setWebsiteUrl(merchant.website_url || '')
                      setBotAvatarUrl(merchant.bot_avatar_url || '')
                    }}
                    className="px-4 py-2 border border-dark-200 hover:bg-cream-100 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6 text-sm max-w-2xl">
                <div>
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Business Name</span>
                  <span className="font-semibold text-dark-900">{merchant.business_name}</span>
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Category</span>
                  <span className="font-semibold text-dark-900">{merchant.business_category}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Description</span>
                  <p className="text-dark-700">{merchant.short_description || 'No description provided.'}</p>
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Address</span>
                  <span className="text-dark-700">{merchant.store_address || 'No address provided.'}</span>
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Business Phone</span>
                  <span className="text-dark-700">{merchant.business_phone || 'No phone provided.'}</span>
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Website URL</span>
                  {merchant.website_url ? (
                    <a href={merchant.website_url} target="_blank" className="text-primary-500 hover:underline flex items-center gap-0.5">
                      {merchant.website_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-dark-500">None</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-bold block mb-0.5">Bot Icon</span>
                  {merchant.bot_avatar_url ? (
                    <div className="flex items-center gap-2 mt-1">
                      <img src={merchant.bot_avatar_url} alt="Bot Icon" className="w-8 h-8 rounded-lg object-cover border border-dark-100 shadow-sm" />
                      <span className="text-xs text-dark-600 truncate max-w-[150px]">{merchant.bot_avatar_url}</span>
                    </div>
                  ) : (
                    <span className="text-dark-500">Default Bot Icon</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Products */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-dark-950">
                {language === 'en' ? 'Manage Products' : 'إدارة المنتجات'}
              </h3>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                {language === 'en' ? 'Add Product' : 'إضافة منتج'}
              </button>
            </div>

            {showAddProduct && (
              <form onSubmit={handleAddProduct} className="bg-cream-50/50 p-4 border border-dark-100 rounded-2xl max-w-xl space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-dark-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                      placeholder="e.g. Latte Coffee"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-700 mb-1">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                      placeholder="4.50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    placeholder="Brief details about the product..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Product Image URL</label>
                  <input
                    type="url"
                    value={pImageUrl}
                    onChange={(e) => setPImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold">
                    Save Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-4 py-2 border border-dark-200 hover:bg-cream-100 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {initialProducts.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <ShoppingBag className="w-12 h-12 mx-auto text-dark-300 mb-2" />
                No products found. Add your first product to display it in the chatbot catalog!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {initialProducts.map((p) => (
                  <div key={p.id} className="border border-dark-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-dark-950 truncate">{p.name}</h4>
                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">${p.price}</span>
                      </div>
                      <p className="text-xs text-dark-600 line-clamp-2 mb-4">{p.description || 'No description'}</p>
                    </div>
                    <div className="flex justify-between items-center border-t border-dark-50 pt-2 text-xs">
                      <span className="text-[10px] text-dark-400">Active</span>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: FAQs */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-dark-950">
                {language === 'en' ? 'Manage FAQs' : 'الأسئلة الشائعة'}
              </h3>
              <button
                onClick={() => setShowAddFAQ(!showAddFAQ)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-900 hover:bg-dark-800 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                {language === 'en' ? 'Add Question' : 'إضافة سؤال'}
              </button>
            </div>

            {showAddFAQ && (
              <form onSubmit={handleAddFAQ} className="bg-cream-50/50 p-4 border border-dark-100 rounded-2xl max-w-xl space-y-4">
                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Question *</label>
                  <input
                    type="text"
                    required
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    placeholder="e.g. Do you offer home delivery?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 mb-1">Answer *</label>
                  <textarea
                    rows={3}
                    required
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-xl text-sm"
                    placeholder="Provide a helpful response..."
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold">
                    Save FAQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddFAQ(false)}
                    className="px-4 py-2 border border-dark-200 hover:bg-cream-100 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {initialFAQs.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <HelpCircle className="w-12 h-12 mx-auto text-dark-300 mb-2" />
                No FAQs defined. Add common questions to train your automated chatbot!
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {initialFAQs.map((f) => (
                  <div key={f.id} className="border border-dark-100 rounded-2xl p-4 flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-bold text-dark-950 text-sm">Q: {f.question}</h4>
                      <p className="text-xs text-dark-600">A: {f.answer}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFAQ(f.id)}
                      className="text-red-500 hover:text-red-600 text-xs font-semibold shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Working Hours */}
        {activeTab === 'hours' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-dark-950">
              {language === 'en' ? 'Configure Business Hours' : 'تعديل مواعيد العمل'}
            </h3>

            <div className="space-y-3 max-w-2xl">
              {hours.map((h, idx) => (
                <div key={h.day_of_week} className="flex flex-wrap items-center justify-between gap-4 p-3 border border-dark-100 rounded-xl bg-cream-50/20">
                  <span className="font-semibold text-sm w-24">
                    {language === 'en' ? h.nameEn : h.nameAr}
                  </span>

                  <div className="flex items-center gap-4 flex-1 justify-end">
                    <label className="flex items-center gap-1.5 text-xs text-dark-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.is_closed}
                        onChange={(e) => {
                          const updated = [...hours]
                          updated[idx].is_closed = e.target.checked
                          setHours(updated)
                        }}
                        className="rounded border-dark-300 text-primary-500 focus:ring-primary-500"
                      />
                      Closed
                    </label>

                    {!h.is_closed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={h.open_time}
                          onChange={(e) => {
                            const updated = [...hours]
                            updated[idx].open_time = e.target.value
                            setHours(updated)
                          }}
                          className="px-2 py-1 border border-dark-200 rounded-lg text-xs"
                        />
                        <span className="text-xs text-dark-500">to</span>
                        <input
                          type="time"
                          value={h.close_time}
                          onChange={(e) => {
                            const updated = [...hours]
                            updated[idx].close_time = e.target.value
                            setHours(updated)
                          }}
                          className="px-2 py-1 border border-dark-200 rounded-lg text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveHours}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Working Hours'}
            </button>
          </div>
        )}

        {/* Tab 5: Chatbot Link */}
        {activeTab === 'link' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-dark-950">
                {language === 'en' ? 'Store Chatbot URL' : 'رابط الشات بوت المخصص لمتجرك'}
              </h3>
              <p className="text-sm text-dark-600 max-w-xl mt-1">
                {language === 'en' 
                  ? 'Your custom chatbot link is live! Copy this URL and share it on Instagram, WhatsApp, or your website so buyers can chat with your bot and browse products instantly.'
                  : 'رابط الشات بوت المخصص لعملك مفعل الآن! انسخ هذا الرابط وشاركه على انستقرام أو واتساب أو موقعك الإلكتروني لكي يتمكن الزوار من التحدث مع البوت وتصفح منتجاتك مباشرة.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 max-w-2xl bg-cream-50 border border-dark-100 p-4 rounded-2xl">
              <span className="text-xs font-bold text-dark-700 flex-1 break-all select-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/chat/${merchant.slug}` : `/chat/${merchant.slug}`}
              </span>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={copyChatbotLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-dark-200 hover:bg-cream-100 text-dark-900 text-xs font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <a
                  href={`/chat/${merchant.slug}`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visit
                </a>
              </div>
            </div>

            {/* Embed Widget Section */}
            <div className="pt-6 border-t border-dark-100 space-y-3">
              <div>
                <h3 className="text-md font-bold text-dark-950">
                  {language === 'en' ? 'Embed Chat Widget' : 'كود تضمين الشات بوت في موقعك'}
                </h3>
                <p className="text-sm text-dark-600 max-w-xl mt-1">
                  {language === 'en' 
                    ? 'Add a floating chat bubble to your website (like Intercom). Copy and paste this single line script tag into your website\'s HTML (inside head or before body close).'
                    : 'أضف فقاعة شات عائمة ذكية إلى موقعك الإلكتروني (مثل Intercom). انسخ هذا الكود البرمجي البسيط والصقه في ملف HTML الخاص بموقعك.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 max-w-2xl bg-cream-50 border border-dark-100 p-4 rounded-2xl">
                <span className="text-xs font-mono text-dark-700 flex-1 break-all select-all">
                  {typeof window !== 'undefined' 
                    ? `<script src="${window.location.origin}/widget.js" data-merchant="${merchant.slug}" async></script>` 
                    : `<script src="https://rodlli.com/widget.js" data-merchant="${merchant.slug}" async></script>`}
                </span>

                <button
                  onClick={copyEmbedCode}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-dark-200 hover:bg-cream-100 text-dark-900 text-xs font-semibold shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Copy Code' : 'نسخ الكود'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Unanswered Questions */}
        {activeTab === 'unanswered' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-dark-950">
              {language === 'en' ? 'Unanswered Customer Questions' : 'أسئلة العملاء المعلقة'}
            </h3>
            <p className="text-sm text-dark-600 max-w-xl">
              {language === 'en'
                ? 'These are questions buyers asked the chatbot that it was not confident enough to answer. Convert them to FAQs to train your bot!'
                : 'هذه هي الأسئلة التي طرحها المتسوقون ولم يتمكن الشات بوت من الإجابة عليها بثقة. يمكنك إضافتها مباشرة كأقسام أسئلة شائعة جديدة لتدريب البوت عليها!'}
            </p>

            {initialUnanswered.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <HelpCircle className="w-12 h-12 mx-auto text-dark-300 mb-2" />
                {language === 'en' ? 'No unanswered questions currently.' : 'لا توجد أسئلة معلقة حالياً.'}
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {initialUnanswered.map((q) => (
                  <div key={q.id} className="border border-dark-100 rounded-2xl p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 hover:shadow-sm transition-all bg-cream-50/20">
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase">Pending</span>
                      <h4 className="font-bold text-dark-950 text-sm mt-1">&quot;{q.question_text}&quot;</h4>
                      <p className="text-[10px] text-dark-400">Asked on: {new Date(q.created_at).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setFaqQuestion(q.question_text)
                          setFaqAnswer('')
                          setPendingResolveId(q.id)
                          setShowAddFAQ(true)
                          setActiveTab('faq')
                          showMessage(
                            language === 'en' 
                              ? 'Question loaded! Enter the answer to save as FAQ.' 
                              : 'تم تحميل السؤال! اكتب الإجابة بالأسفل لحفظه وتدريب البوت.',
                            null
                          )
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === 'en' ? 'Add as FAQ' : 'إضافة لسؤال شائع'}
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm(language === 'en' ? 'Dismiss this question?' : 'تجاهل هذا السؤال؟')) return
                          const res = await resolveUnansweredQuestion(q.id)
                          if (res.error) {
                            showMessage(null, res.error)
                          } else {
                            showMessage(language === 'en' ? 'Question dismissed' : 'تم تجاهل السؤال', null)
                            router.refresh()
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-dark-200 hover:bg-cream-50 text-dark-600 hover:text-dark-900 text-xs font-bold transition-all"
                      >
                        {language === 'en' ? 'Dismiss' : 'تجاهل'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
