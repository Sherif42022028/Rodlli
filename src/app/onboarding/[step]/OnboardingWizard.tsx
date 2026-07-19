'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/layout/I18nProvider'
import { upsertMerchant, updateOnboardingStep, addProduct, deleteProduct, addFAQ, deleteFAQ } from '@/app/actions/merchant'
import { 
  Store, Tag, FileText, MapPin, Phone, Globe, AlertCircle, Check, 
  ArrowLeft, ArrowRight, ShoppingBag, HelpCircle, Plus, Trash2, Copy, ExternalLink, Sparkles 
} from 'lucide-react'

interface OnboardingWizardProps {
  merchant: any
  categories: any[]
  initialProducts: any[]
  initialFAQs: any[]
  step: number
  currentStep: number
}

function getSuggestedFAQs(categoryNameEn: string, language: 'en' | 'ar') {
  const suggestions: Record<string, Array<{ question: string; questionAr: string }>> = {
    'Food & Drinks': [
      { question: 'Do you offer home delivery? What is the cost?', questionAr: 'هل يتوفر لديكم توصيل؟ وما هي التكلفة؟' },
      { question: 'What are your working hours?', questionAr: 'ما هي مواعيد العمل لديكم؟' },
      { question: 'Where are you located?', questionAr: 'أين يقع مكانكم؟' },
      { question: 'What payment options are available?', questionAr: 'ما هي خيارات الدفع المتاحة؟' },
    ],
    'Fashion & Clothing': [
      { question: 'What is your return and exchange policy?', questionAr: 'ما هي سياسة الاستبدال والاسترجاع؟' },
      { question: 'How long does delivery take?', questionAr: 'كم يستغرق التوصيل؟' },
      { question: 'How do I choose the correct size?', questionAr: 'كيف يمكنني معرفة القياس المناسب؟' },
      { question: 'What payment methods do you accept?', questionAr: 'ما هي طرق الدفع المتاحة؟' },
    ],
    'Health & Beauty': [
      { question: 'Are your products original and certified?', questionAr: 'هل المنتجات أصلية ومصرحة؟' },
      { question: 'How long does delivery take?', questionAr: 'كم يستغرق التوصيل؟' },
      { question: 'What payment options do you support?', questionAr: 'ما هي خيارات الدفع المتاحة؟' },
      { question: 'Where can I find ingredient details?', questionAr: 'أين يمكنني العثور على تفاصيل المكونات؟' },
    ],
    'Electronics': [
      { question: 'Is there a warranty period on devices?', questionAr: 'هل تتوفر فترة ضمان على الأجهزة؟' },
      { question: 'What is the return policy for damaged products?', questionAr: 'ما هي سياسة الاسترجاع للمنتجات التالفة؟' },
      { question: 'What are the payment and installment options?', questionAr: 'ما هي خيارات الدفع والتقسيط؟' },
      { question: 'How long does shipping take?', questionAr: 'كم يستغرق الشحن والتوصيل؟' },
    ],
    'Home & Services': [
      { question: 'Do you offer installation and maintenance services?', questionAr: 'هل تقدمون خدمات التركيب والصيانة؟' },
      { question: 'How can I book an appointment?', questionAr: 'كيف يمكنني حجز موعد؟' },
      { question: 'What payment options do you accept?', questionAr: 'ما هي طرق الدفع المتاحة؟' },
      { question: 'Which areas do your services cover?', questionAr: 'ما هي المناطق التي تغطيها خدماتكم؟' },
    ],
  }

  const categoryKey = Object.keys(suggestions).find(
    (key) => key.toLowerCase() === categoryNameEn?.toLowerCase()
  ) || 'Default'

  const list = suggestions[categoryKey] || [
    { question: 'What payment options are available?', questionAr: 'ما هي خيارات الدفع المتاحة؟' },
    { question: 'Do you offer home delivery?', questionAr: 'هل يتوفر لديكم توصيل؟' },
    { question: 'How can I contact you?', questionAr: 'كيف يمكنني التواصل معكم؟' },
  ]

  return list.map((item) => ({
    question: language === 'ar' ? item.questionAr : item.question
  }))
}

export default function OnboardingWizard({
  merchant,
  categories,
  initialProducts,
  initialFAQs,
  step,
  currentStep
}: OnboardingWizardProps) {
  const { language, t } = useTranslation()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Step 1: Business Basics State
  const [businessName, setBusinessName] = useState(merchant.business_name || '')
  const [selectedCatId, setSelectedCatId] = useState(merchant.category_id || '')
  const [shortDescription, setShortDescription] = useState(merchant.short_description || '')
  const [businessPhone, setBusinessPhone] = useState(merchant.business_phone || '')
  const [storeAddress, setStoreAddress] = useState(merchant.store_address || '')
  const [websiteUrl, setWebsiteUrl] = useState(merchant.website_url || '')

  // Step 2: First Product State
  const [pName, setPName] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pDescription, setPDescription] = useState('')
  const [pImageUrl, setPImageUrl] = useState('')
  const [productsList, setProductsList] = useState(initialProducts)

  // Step 3: First FAQ State
  const [faqAnswerInput, setFaqAnswerInput] = useState<Record<string, string>>({})
  const [customQuestion, setCustomQuestion] = useState('')
  const [customAnswer, setCustomAnswer] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [faqsList, setFaqsList] = useState(initialFAQs)

  // Step 4: Success Screen State
  const [copied, setCopied] = useState(false)

  // Load active category
  useEffect(() => {
    if (merchant.category_id) {
      setSelectedCatId(merchant.category_id)
    }
  }, [merchant.category_id])

  // Sync products and FAQs list on initial fetch
  useEffect(() => {
    setProductsList(initialProducts)
  }, [initialProducts])

  useEffect(() => {
    setFaqsList(initialFAQs)
  }, [initialFAQs])

  // Find English name of chosen category for FAQ suggestions
  const selectedCategoryObj = categories.find(c => c.id === selectedCatId)
  const categoryNameEn = selectedCategoryObj ? selectedCategoryObj.name_en : merchant.business_category || ''
  const suggestedFAQs = getSuggestedFAQs(categoryNameEn, language)

  // Step 1 Submission
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!businessName.trim()) {
      setError(language === 'en' ? 'Business name is required' : 'اسم النشاط التجاري مطلوب')
      setLoading(false)
      return
    }
    if (!selectedCatId) {
      setError(language === 'en' ? 'Please select a category' : 'يرجى اختيار فئة النشاط')
      setLoading(false)
      return
    }
    if (shortDescription.trim().length < 20) {
      setError(language === 'en' ? 'Description must be at least 20 characters' : 'الوصف يجب أن يكون 20 حرفًا على الأقل')
      setLoading(false)
      return
    }
    if (!businessPhone.trim()) {
      setError(language === 'en' ? 'Phone / WhatsApp is required' : 'رقم الهاتف / الواتساب مطلوب')
      setLoading(false)
      return
    }

    const catObj = categories.find(c => c.id === selectedCatId)
    const categoryName = catObj ? (language === 'ar' ? catObj.name_ar : catObj.name_en) : ''

    const result = await upsertMerchant(
      {
        businessName,
        businessCategory: categoryName,
        categoryId: selectedCatId,
        shortDescription,
        storeAddress,
        businessPhone,
        websiteUrl,
        onboardingStep: Math.max(currentStep, 2)
      },
      merchant.profile_id
    )

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/onboarding/2')
      router.refresh()
    }
  }

  // Step 2 Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!pName.trim()) {
      setError(language === 'en' ? 'Product name is required' : 'اسم المنتج مطلوب')
      setLoading(false)
      return
    }
    if (!pPrice || isNaN(parseFloat(pPrice)) || parseFloat(pPrice) < 0) {
      setError(language === 'en' ? 'Please enter a valid price' : 'يرجى إدخال سعر صحيح')
      setLoading(false)
      return
    }

    const result = await addProduct(
      {
        name: pName,
        price: parseFloat(pPrice),
        description: pDescription,
        imageUrls: pImageUrl.trim() ? [pImageUrl.trim()] : []
      },
      merchant.id
    )

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setPName('')
      setPPrice('')
      setPDescription('')
      setPImageUrl('')
      setSuccess(language === 'en' ? 'Product added successfully!' : 'تم إضافة المنتج بنجاح!')
      setTimeout(() => setSuccess(null), 3000)
      
      // Update list dynamically by refreshing
      router.refresh()
    }
  }

  const handleDeleteProduct = async (pId: string) => {
    setError(null)
    const result = await deleteProduct(pId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  const handleStep2Submit = async () => {
    if (productsList.length === 0) {
      setError(language === 'en' ? 'Please add at least one product' : 'يرجى إضافة منتج واحد على الأقل')
      return
    }

    setLoading(true)
    const nextStep = Math.max(currentStep, 3)
    await updateOnboardingStep(merchant.id, nextStep)
    setLoading(false)
    router.push('/onboarding/3')
    router.refresh()
  }

  // Step 3 FAQ Operations
  const handleSaveSuggestedFAQ = async (question: string, answer: string, key: string) => {
    if (!answer.trim()) return
    setLoading(true)
    setError(null)

    const result = await addFAQ(
      {
        question,
        answer,
        orderIndex: faqsList.length
      },
      merchant.id
    )

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      // Clear input
      setFaqAnswerInput(prev => ({
        ...prev,
        [key]: ''
      }))
      setSuccess(language === 'en' ? 'FAQ answer saved!' : 'تم حفظ الإجابة بنجاح!')
      setTimeout(() => setSuccess(null), 3000)
      router.refresh()
    }
  }

  const handleAddCustomFAQ = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuestion.trim() || !customAnswer.trim()) return
    setLoading(true)
    setError(null)

    const result = await addFAQ(
      {
        question: customQuestion,
        answer: customAnswer,
        orderIndex: faqsList.length
      },
      merchant.id
    )

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setCustomQuestion('')
      setCustomAnswer('')
      setShowCustomForm(false)
      setSuccess(language === 'en' ? 'Custom FAQ added!' : 'تم إضافة السؤال المخصص!')
      setTimeout(() => setSuccess(null), 3000)
      router.refresh()
    }
  }

  const handleDeleteFAQ = async (faqId: string) => {
    setError(null)
    const result = await deleteFAQ(faqId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  const handleStep3Submit = async () => {
    if (faqsList.length === 0) {
      setError(language === 'en' ? 'Please answer at least one question' : 'يرجى الإجابة على سؤال واحد على الأقل')
      return
    }

    setLoading(true)
    await updateOnboardingStep(merchant.id, 4)
    setLoading(false)
    router.push('/onboarding/4')
    router.refresh()
  }

  // Copy Link action
  const copyBotLink = () => {
    const fullLink = `${window.location.origin}/chat/${merchant.slug}`
    navigator.clipboard.writeText(fullLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isRTL = language === 'ar'

  // Render Step 1
  const renderStep1 = () => {
    const isNextDisabled = !businessName.trim() || !selectedCatId || shortDescription.trim().length < 20 || !businessPhone.trim()

    return (
      <form onSubmit={handleStep1Submit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-dark-950 tracking-tight">
            {language === 'en' ? 'Tell us about your business' : 'أخبرنا عن عملك التجاري'}
          </h2>
          <p className="text-sm text-dark-600 mt-1">
            {language === 'en' ? 'Provide basic details to kickstart your storefront.' : 'أدخل البيانات الأساسية لمتجرك لتفعيل حسابك.'}
          </p>
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-semibold text-dark-700 mb-1.5">
            {language === 'en' ? 'Business Name *' : 'اسم النشاط التجاري *'}
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-dark-400`}>
              <Store className="w-5 h-5" />
            </div>
            <input
              id="businessName"
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all`}
              placeholder={language === 'en' ? 'e.g. Nero Coffee' : 'مثال: قهوة نيرو'}
            />
          </div>
        </div>

        {/* Business Category Dropdown */}
        <div>
          <label htmlFor="businessCategory" className="block text-sm font-semibold text-dark-700 mb-1.5">
            {language === 'en' ? 'Category *' : 'فئة النشاط *'}
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-dark-400`}>
              <Tag className="w-5 h-5" />
            </div>
            <select
              id="businessCategory"
              required
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-dark-200 rounded-xl bg-white text-dark-900 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all appearance-none`}
            >
              <option value="">{language === 'en' ? '-- Select Category --' : '-- اختر الفئة --'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {language === 'ar' ? cat.name_ar : cat.name_en}
                </option>
              ))}
            </select>
            {/* Custom arrow for custom styling */}
            <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none text-dark-400`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Short Description */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="shortDescription" className="block text-sm font-semibold text-dark-700">
              {language === 'en' ? 'Short Description *' : 'وصف مختصر *'}
            </label>
            <span className={`text-[11px] font-semibold ${shortDescription.length >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {shortDescription.length} / 20 {language === 'en' ? 'chars min' : 'حرف كحد أدنى'}
            </span>
          </div>
          <div className="relative rounded-xl shadow-sm">
            <div className={`absolute ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} pt-3 pointer-events-none text-dark-400`}>
              <FileText className="w-5 h-5" />
            </div>
            <textarea
              id="shortDescription"
              rows={3}
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all`}
              placeholder={language === 'en' ? 'Write at least 20 characters about your shop, products, and services...' : 'اكتب ٢٠ حرفاً على الأقل تصف فيها منتجاتك وخدمات متجرك...'}
            />
          </div>
        </div>

        {/* Phone / WhatsApp */}
        <div>
          <label htmlFor="businessPhone" className="block text-sm font-semibold text-dark-700 mb-1.5">
            {language === 'en' ? 'Phone / WhatsApp *' : 'رقم الهاتف / الواتساب *'}
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-dark-400`}>
              <Phone className="w-5 h-5" />
            </div>
            <input
              id="businessPhone"
              type="tel"
              required
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all`}
              placeholder="+20 100 000 0000"
            />
          </div>
        </div>

        {/* Address (Optional) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="storeAddress" className="block text-sm font-semibold text-dark-700">
              {language === 'en' ? 'Address' : 'عنوان المتجر'}
            </label>
            <span className="text-xs text-dark-400 font-semibold">{language === 'en' ? 'Optional' : 'اختياري'}</span>
          </div>
          <div className="relative rounded-xl shadow-sm">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-dark-400`}>
              <MapPin className="w-5 h-5" />
            </div>
            <input
              id="storeAddress"
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all`}
              placeholder={language === 'en' ? 'e.g. 90th Street, New Cairo' : 'مثال: شارع التسعين، التجمع الخامس'}
            />
          </div>
        </div>

        {/* Website URL (Optional) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="websiteUrl" className="block text-sm font-semibold text-dark-700">
              {language === 'en' ? 'Website URL' : 'موقعك الإلكتروني'}
            </label>
            <span className="text-xs text-dark-400 font-semibold">{language === 'en' ? 'Optional' : 'اختياري'}</span>
          </div>
          <div className="relative rounded-xl shadow-sm">
            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-dark-400`}>
              <Globe className="w-5 h-5" />
            </div>
            <input
              id="websiteUrl"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={`block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition-all`}
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Next Button */}
        <div>
          <button
            type="submit"
            disabled={loading || isNextDisabled}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            {loading ? (
              language === 'en' ? 'Saving...' : 'جاري الحفظ...'
            ) : (
              <span className="flex items-center gap-1">
                {language === 'en' ? 'Next: Add Your First Product' : 'التالي: أضف منتجك الأول'}
                {isRTL ? <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
              </span>
            )}
          </button>
        </div>
      </form>
    )
  }

  // Render Step 2
  const renderStep2 = () => {
    const isFormIncomplete = !pName.trim() || !pPrice.trim() || isNaN(parseFloat(pPrice))

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-dark-950 tracking-tight">
            {language === 'en' ? 'Add your first product' : 'أضف منتجك الأول'}
          </h2>
          <p className="text-sm text-dark-600 mt-1">
            {language === 'en' ? 'Populate your catalog. You must add at least one product.' : 'قم بتغذية كتالوج البوت. يجب إضافة منتج واحد على الأقل.'}
          </p>
        </div>

        {/* Product Add Form */}
        <form onSubmit={handleAddProduct} className="bg-cream-100/50 p-5 border border-dark-100 rounded-2xl space-y-4">
          <div className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">
            {language === 'en' ? 'Product Information' : 'بيانات المنتج'}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-dark-700 mb-1">
                {language === 'en' ? 'Product Name *' : 'اسم المنتج *'}
              </label>
              <input
                type="text"
                required
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                className="w-full px-3 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={language === 'en' ? 'e.g. Hot Latte' : 'مثال: لاتيه ساخن'}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-dark-700 mb-1">
                {language === 'en' ? 'Price *' : 'السعر *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
                className="w-full px-3 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="4.50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-700 mb-1">
              {language === 'en' ? 'Short Description' : 'وصف قصير للمنتج'}
            </label>
            <textarea
              rows={2}
              value={pDescription}
              onChange={(e) => setPDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={language === 'en' ? 'Details about sizing, ingredients, or features...' : 'تفاصيل حول الحجم، المكونات، أو المزايا...'}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-700 mb-1">
              {language === 'en' ? 'Product Image URL' : 'رابط صورة المنتج'}
            </label>
            <input
              type="url"
              value={pImageUrl}
              onChange={(e) => setPImageUrl(e.target.value)}
              className="w-full px-3 py-2.5 border border-dark-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://example.com/product.jpg"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isFormIncomplete}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 border border-dark-200 rounded-xl text-xs font-bold text-dark-900 bg-white hover:bg-cream-100 transition-all disabled:opacity-40"
          >
            <Plus className="w-4 h-4 text-primary-500" />
            {language === 'en' ? '+ Add this product' : '+ أضف هذا المنتج'}
          </button>
        </form>

        {/* Added Products Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-dark-800">
            {language === 'en' ? 'Your Products Catalog' : 'كتالوج منتجاتك المضافة'}
          </h3>

          {productsList.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-dark-100 bg-cream-50/30 rounded-2xl text-xs text-dark-500">
              <ShoppingBag className="w-8 h-8 mx-auto text-dark-300 mb-1.5 animate-bounce" />
              {language === 'en' ? 'No products added yet. Add a product above to continue.' : 'لم تقم بإضافة منتجات بعد. أضف منتجاً أعلاه للمتابعة.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {productsList.map((product) => (
                <div key={product.id} className="flex justify-between items-center p-3 border border-dark-100 rounded-xl bg-white">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {product.image_urls && product.image_urls[0] ? (
                      <img src={product.image_urls[0]} alt={product.name} className="w-8 h-8 rounded-lg object-cover border border-dark-100 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs shrink-0">
                        {product.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="truncate">
                      <h4 className="font-bold text-xs text-dark-900 truncate">{product.name}</h4>
                      <p className="text-[10px] text-dark-500 truncate">{product.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      ${product.price}
                    </span>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 border-t border-dark-100 pt-4">
          <button
            type="button"
            onClick={() => router.push('/onboarding/1')}
            className="flex-1 flex justify-center items-center gap-1.5 py-3 px-4 border border-dark-200 rounded-xl text-sm font-semibold text-dark-700 bg-white hover:bg-cream-100 transition-all"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'en' ? 'Back' : 'الرجوع'}
          </button>
          <button
            type="button"
            onClick={handleStep2Submit}
            disabled={loading || productsList.length === 0}
            className="flex-1 flex justify-center items-center gap-1.5 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 focus:outline-none transition-all disabled:opacity-40 group"
          >
            {language === 'en' ? 'Next: FAQs setup' : 'التالي: الأسئلة الشائعة'}
            {isRTL ? <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>
    )
  }

  // Render Step 3
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-dark-950 tracking-tight">
            {language === 'en' ? 'Answer a few common questions' : 'أجب على بعض الأسئلة الشائعة'}
          </h2>
          <p className="text-sm text-dark-600 mt-1">
            {language === 'en' ? 'Help training the bot. Answer at least one question.' : 'ساعد في تدريب البوت. أجب على سؤال واحد على الأقل.'}
          </p>
        </div>

        {/* Saved FAQs List */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-dark-800">
            {language === 'en' ? 'Saved Questions' : 'الأسئلة التي تم حفظها'}
          </h3>

          {faqsList.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-dark-100 bg-cream-50/20 rounded-xl text-xs text-dark-500">
              {language === 'en' ? 'No FAQs saved yet. Answer a suggested question below to continue.' : 'لم تقم بحفظ أي سؤال بعد. أجب على أحد الأسئلة المقترحة بالأسفل للمتابعة.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {faqsList.map((faq) => (
                <div key={faq.id} className="flex justify-between items-start gap-3 p-3 border border-emerald-100 rounded-xl bg-emerald-50/20">
                  <div className="text-xs text-dark-800 flex-1">
                    <span className="font-extrabold block text-emerald-800">Q: {faq.question}</span>
                    <span className="block mt-0.5 text-dark-600">A: {faq.answer}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteFAQ(faq.id)}
                    className="text-red-500 hover:text-red-600 shrink-0 p-0.5 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggested Questions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-dark-800 flex items-center gap-1">
            <Sparkles className="w-4.5 h-4.5 text-primary-500" />
            {language === 'en' ? 'Suggested for your category' : 'أسئلة مقترحة لفئة متجرك'}
          </h3>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {suggestedFAQs
              // Filter out suggested questions that are already answered in faqsList
              .filter(s => !faqsList.some(f => f.question.toLowerCase() === s.question.toLowerCase()))
              .map((s, idx) => {
                const key = `suggested-${idx}`
                const value = faqAnswerInput[key] || ''
                return (
                  <div key={key} className="p-4 border border-dark-100 rounded-xl bg-white shadow-xs space-y-2">
                    <div className="font-bold text-xs text-dark-900">
                      {s.question}
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        rows={1}
                        value={value}
                        onChange={(e) => setFaqAnswerInput(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 px-3 py-1.5 border border-dark-200 rounded-lg text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        placeholder={language === 'en' ? 'Type your answer here...' : 'اكتب إجابتك هنا...'}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSuggestedFAQ(s.question, value, key)}
                        disabled={!value.trim() || loading}
                        className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 shrink-0"
                      >
                        {language === 'en' ? 'Save' : 'حفظ'}
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Custom FAQ Form Option */}
        <div>
          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {language === 'en' ? 'Add Custom Question' : 'إضافة سؤال مخصص'}
            </button>
          ) : (
            <form onSubmit={handleAddCustomFAQ} className="p-4 border border-dark-100 bg-cream-50/50 rounded-xl space-y-3">
              <div className="text-xs font-bold text-dark-700">
                {language === 'en' ? 'Custom Question & Answer' : 'سؤال وجواب مخصص'}
              </div>
              <input
                type="text"
                required
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-xs focus:outline-none"
                placeholder={language === 'en' ? 'Type your custom question...' : 'اكتب سؤالك المخصص...'}
              />
              <textarea
                rows={2}
                required
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-dark-200 rounded-lg text-xs focus:outline-none"
                placeholder={language === 'en' ? 'Type the answer...' : 'اكتب الإجابة...'}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="px-3 py-1.5 border border-dark-200 rounded-lg text-xs font-semibold"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold"
                >
                  {language === 'en' ? 'Save' : 'حفظ'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 border-t border-dark-100 pt-4">
          <button
            type="button"
            onClick={() => router.push('/onboarding/2')}
            className="flex-1 flex justify-center items-center gap-1.5 py-3 px-4 border border-dark-200 rounded-xl text-sm font-semibold text-dark-700 bg-white hover:bg-cream-100 transition-all"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {language === 'en' ? 'Back' : 'الرجوع'}
          </button>
          <button
            type="button"
            onClick={handleStep3Submit}
            disabled={loading || faqsList.length === 0}
            className="flex-1 flex justify-center items-center gap-1.5 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 focus:outline-none transition-all disabled:opacity-40 group"
          >
            {language === 'en' ? 'Next: Complete!' : 'التالي: إنهاء التسجيل'}
            {isRTL ? <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>
    )
  }

  // Render Success Screen (Step 4)
  const renderStep4 = () => {
    const fullLink = `${window.location.origin}/chat/${merchant.slug}`

    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
          <Check className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-dark-950 tracking-tight">
            {language === 'en' ? "You're all set! 🎉" : 'تم إعداد حسابك بنجاح! 🎉'}
          </h2>
          <p className="text-sm text-dark-600 max-w-sm mx-auto">
            {language === 'en' 
              ? 'Your storefront and AI smart bot are live and ready to interact with your customers.'
              : 'متجرك الإلكتروني ومساعد الذكاء الاصطناعي نشطين وجاهزين لاستقبال عملائك.'}
          </p>
        </div>

        {/* Invite Link Card */}
        <div className="bg-cream-100/50 border border-dark-100 p-5 rounded-2xl space-y-3 text-left">
          <div className="text-xs font-bold text-dark-700 text-center sm:text-left">
            {language === 'en' ? 'Share Your Bot URL' : 'شارك رابط البوت المخصص لمتجرك'}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-white border border-dark-100 p-2.5 rounded-xl">
            <span className="text-xs font-semibold text-dark-700 break-all select-all flex-1 px-1 text-center sm:text-left">
              {fullLink}
            </span>
            <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end shrink-0">
              <button
                type="button"
                onClick={copyBotLink}
                className="flex items-center justify-center gap-1 px-3 py-2 border border-dark-200 rounded-lg text-xs font-bold text-dark-900 bg-white hover:bg-cream-50"
              >
                <Copy className="w-3.5 h-3.5 text-primary-500" />
                {copied ? (language === 'en' ? 'Copied' : 'تم النسخ') : (language === 'en' ? 'Copy' : 'نسخ')}
              </button>
              <a
                href={fullLink}
                target="_blank"
                className="flex items-center justify-center gap-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {language === 'en' ? 'Visit' : 'زيارة'}
              </a>
            </div>
          </div>
        </div>

        {/* Complete Redirect */}
        <button
          type="button"
          onClick={() => router.push('/merchant/dashboard')}
          className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 transition-all shadow-sm"
        >
          {language === 'en' ? 'Go to Dashboard' : 'الذهاب إلى لوحة التحكم'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-dark-100 shadow-xl overflow-hidden relative">
      {/* Toast Alert */}
      {success && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-md transition-all animate-fade-in-down">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm shadow-md transition-all animate-fade-in-down">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 font-bold">×</button>
        </div>
      )}

      {/* Progress Bar (Only show for steps 1-3) */}
      {step < 4 && (
        <div className="w-full bg-dark-50/50 h-2 flex">
          <div 
            className="bg-primary-500 h-full transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      )}

      {/* Header Info */}
      {step < 4 && (
        <div className="px-6 pt-6 flex justify-between items-center text-xs font-bold text-dark-500 border-b border-dark-50 pb-3 bg-cream-50/30">
          <span className="flex items-center gap-1 uppercase tracking-wider text-[10px]">
            {language === 'en' ? `Step ${step} of 3` : `الخطوة ${step} من 3`}
          </span>
          <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full text-[10px]">
            {step === 1 && (language === 'en' ? 'Business Basics' : 'بيانات النشاط')}
            {step === 2 && (language === 'en' ? 'First Product' : 'المنتج الأول')}
            {step === 3 && (language === 'en' ? 'First FAQ' : 'الأسئلة الشائعة')}
          </span>
        </div>
      )}

      {/* Form Content */}
      <div className="p-6 md:p-8">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  )
}
