'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/layout/I18nProvider'
import { upsertMerchant } from '@/app/actions/merchant'
import { Store, Tag, FileText, MapPin, Phone, Globe, AlertCircle } from 'lucide-react'

export default function OnboardingForm({ profileId }: { profileId: string }) {
  const { language, t } = useTranslation()
  const router = useRouter()

  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await upsertMerchant(
      {
        businessName,
        businessCategory,
        shortDescription,
        storeAddress,
        businessPhone,
        websiteUrl,
      },
      profileId
    )

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/merchant/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Business Name */}
      <div>
        <label htmlFor="businessName" className="block text-sm font-semibold text-dark-700 mb-1.5">
          {t('merchant.businessName')} *
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
            <Store className="w-5 h-5" />
          </div>
          <input
            id="businessName"
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
            placeholder={language === 'en' ? 'e.g. Cafe Nero' : 'مثال: متجر قهوتي'}
          />
        </div>
      </div>

      {/* Business Category */}
      <div>
        <label htmlFor="businessCategory" className="block text-sm font-semibold text-dark-700 mb-1.5">
          {t('merchant.category')} *
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
            <Tag className="w-5 h-5" />
          </div>
          <input
            id="businessCategory"
            type="text"
            required
            value={businessCategory}
            onChange={(e) => setBusinessCategory(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
            placeholder={language === 'en' ? 'e.g. Restaurants, Clothing' : 'مثال: ملابس، مقاهي'}
          />
        </div>
      </div>

      {/* Short Description */}
      <div>
        <label htmlFor="shortDescription" className="block text-sm font-semibold text-dark-700 mb-1.5">
          {t('merchant.description')}
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none text-dark-400">
            <FileText className="w-5 h-5" />
          </div>
          <textarea
            id="shortDescription"
            rows={3}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
            placeholder={language === 'en' ? 'Brief description of your products or services...' : 'وصف مختصر لمتجرك ومنتجاتك...'}
          />
        </div>
      </div>

      {/* Store Address */}
      <div>
        <label htmlFor="storeAddress" className="block text-sm font-semibold text-dark-700 mb-1.5">
          {t('merchant.storeAddress')}
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
            <MapPin className="w-5 h-5" />
          </div>
          <input
            id="storeAddress"
            type="text"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
            placeholder={language === 'en' ? 'e.g. 123 Main St, New Cairo' : 'مثال: شارع التسعين، التجمع الخامس'}
          />
        </div>
      </div>

      {/* Business Phone */}
      <div>
        <label htmlFor="businessPhone" className="block text-sm font-semibold text-dark-700 mb-1.5">
          {t('merchant.phone')}
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
            <Phone className="w-5 h-5" />
          </div>
          <input
            id="businessPhone"
            type="tel"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
            placeholder="+20 100 000 0000"
          />
        </div>
      </div>

      {/* Website URL */}
      <div>
        <label htmlFor="websiteUrl" className="block text-sm font-semibold text-dark-700 mb-1.5">
          {t('merchant.website')}
        </label>
        <div className="relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
            <Globe className="w-5 h-5" />
          </div>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-900 transition-all disabled:opacity-50"
        >
          {loading ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : t('merchant.next')}
        </button>
      </div>
    </form>
  )
}
