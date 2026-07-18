'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/layout/I18nProvider'
import { upsertMerchant, addProduct, deleteProduct, addFAQ, deleteFAQ, updateWorkingHours, resolveUnansweredQuestion } from '@/app/actions/merchant'
import { 
  Store, ShoppingBag, HelpCircle, Clock, Link2, Copy, ExternalLink, 
  Trash2, Plus, Edit2, Check, AlertCircle, RefreshCw, MessageSquareWarning 
} from 'lucide-react'

export default function MerchantDashboardClient({
  merchant,
  initialProducts,
  initialFAQs,
  initialHours,
  initialUnanswered
}: {
  merchant: any
  initialProducts: any[]
  initialFAQs: any[]
  initialHours: any[]
  initialUnanswered: any[]
}) {
  const { language, t } = useTranslation()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'faq' | 'hours' | 'link' | 'unanswered'>('info')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [pendingResolveId, setPendingResolveId] = useState<string | null>(null)

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
