'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/components/layout/I18nProvider'
import { getStores } from '@/app/actions/buyer'
import { Search, ShoppingBag, Store, ArrowRight, Bot, Compass, Sparkles } from 'lucide-react'

export default function BuyerDashboardClient({
  categories,
  trendingStores,
  initialStores,
  recommendedStores = []
}: {
  categories: any[]
  trendingStores: any[]
  initialStores: any[]
  recommendedStores?: any[]
}) {
  const { language } = useTranslation()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [stores, setStores] = useState<any[]>(initialStores)
  const [loading, setLoading] = useState(false)

  // Fetch filtered stores
  const fetchFilteredStores = async (catId: string | null, search: string) => {
    setLoading(true)
    const filtered = await getStores(catId || undefined, search || undefined)
    setStores(filtered)
    setLoading(false)
  }

  // Handle category click
  const handleCategoryClick = (catId: string) => {
    const nextCat = selectedCategory === catId ? null : catId
    setSelectedCategory(nextCat)
    fetchFilteredStores(nextCat, searchQuery)
  }

  // Handle search submit
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    fetchFilteredStores(selectedCategory, val)
  }

  return (
    <div className="space-y-10">
      {/* Search Input Card */}
      <div className="relative max-w-2xl bg-white border border-dark-100 rounded-2xl p-2 shadow-sm flex items-center gap-2">
        <div className="pl-3 text-dark-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={language === 'en' ? 'Search stores, products, services...' : 'ابحث عن متاجر، منتجات، خدمات...'}
          className="flex-1 py-2 px-1 focus:outline-none text-sm placeholder-dark-400 text-dark-900 bg-transparent"
        />
        {loading && (
          <span className="text-xs text-dark-400 animate-pulse pr-3">
            {language === 'en' ? 'Searching...' : 'جاري البحث...'}
          </span>
        )}
      </div>

      {/* Popular Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-dark-950 flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary-500" />
          {language === 'en' ? 'Browse by Category' : 'تصفح حسب الفئة'}
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                  isSelected 
                    ? 'border-primary-500 bg-primary-50/50 shadow-sm ring-1 ring-primary-500' 
                    : 'border-dark-100 bg-white hover:border-dark-200 hover:shadow-sm'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-cream-50 flex items-center justify-center text-primary-500 text-lg">
                  {cat.icon === 'utensils' && '🍴'}
                  {cat.icon === 'shirt' && '👕'}
                  {cat.icon === 'heart' && '💖'}
                  {cat.icon === 'laptop' && '💻'}
                  {cat.icon === 'home' && '🏠'}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-dark-950 truncate">
                    {language === 'en' ? cat.name_en : cat.name_ar}
                  </h4>
                  <span className="text-[10px] text-dark-500">
                    {cat.store_count} {language === 'en' ? 'stores' : 'متاجر'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left/Middle Column: Stores List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-dark-950 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary-500" />
            {selectedCategory 
              ? (language === 'en' ? 'Matching Stores' : 'المتاجر المطابقة')
              : (language === 'en' ? 'All Active Stores' : 'جميع المتاجر النشطة')}
          </h3>

          {stores.length === 0 ? (
            <div className="bg-white border border-dark-100 rounded-3xl p-12 text-center text-dark-500">
              <Store className="w-12 h-12 mx-auto text-dark-300 mb-2" />
              {language === 'en' ? 'No matching stores found.' : 'لم يتم العثور على متاجر مطابقة.'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {stores.map((s) => (
                <div 
                  key={s.id}
                  className="bg-white border border-dark-100 hover:border-primary-200 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-cream-50 overflow-hidden flex items-center justify-center shrink-0 border border-dark-100">
                      {s.bot_avatar_url ? (
                        <img src={s.bot_avatar_url} alt={s.business_name} className="w-full h-full object-contain p-0.5 bg-white" />
                      ) : (
                        <Bot className="w-6 h-6 text-dark-500" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="font-extrabold text-sm text-dark-950 truncate leading-tight">{s.business_name}</h4>
                        {s.is_online && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] bg-cream-100 text-dark-700 px-2 py-0.5 rounded-full font-bold inline-block mb-2">
                        {language === 'en' ? s.category_name_en : s.category_name_ar}
                      </span>
                      <p className="text-xs text-dark-600 line-clamp-2 leading-relaxed">
                        {s.short_description || 'Welcome to our storefront! Tap below to start chatting.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-5 pt-3 border-t border-dark-50 flex justify-between items-center text-xs">
                    <span className="text-dark-400 font-medium">Chat Assistant ready</span>
                    <Link 
                      href={`/chat/${s.slug}`}
                      className="flex items-center gap-1 font-bold text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      {language === 'en' ? 'Start Chat' : 'ابدأ المحادثة'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recommended & Trending Panel */}
        <div className="space-y-6">
          {/* Recommended Section (Optional: only displayed if interests score exists) */}
          {recommendedStores && recommendedStores.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-bold text-dark-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                {language === 'en' ? 'Recommended for You' : 'مقترح لك'}
              </h3>

              <div className="bg-white border border-dark-100 rounded-3xl p-5 space-y-4 shadow-sm">
                {recommendedStores.map((s) => (
                  <Link 
                    key={s.id}
                    href={`/chat/${s.slug}`}
                    className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-cream-50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream-50 flex items-center justify-center shrink-0 border border-dark-100">
                      {s.bot_avatar_url ? (
                        <img src={s.bot_avatar_url} alt={s.business_name} className="w-full h-full object-contain p-0.5 bg-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-dark-500" />
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <h4 className="font-bold text-xs text-dark-950 group-hover:text-primary-500 truncate leading-tight transition-colors">
                        {s.business_name}
                      </h4>
                      <span className="text-[9px] text-dark-500">
                        {language === 'en' ? s.category_name_en : s.category_name_ar}
                      </span>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trending Stores Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-dark-950 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-500" />
              {language === 'en' ? 'Trending Stores' : 'المتاجر الرائجة'}
            </h3>

            <div className="bg-white border border-dark-100 rounded-3xl p-5 space-y-4 shadow-sm">
            {trendingStores.length === 0 ? (
              <p className="text-xs text-dark-500 italic">No trending stores currently.</p>
            ) : (
              trendingStores.map((s) => (
                <Link 
                  key={s.id}
                  href={`/chat/${s.slug}`}
                  className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-cream-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream-50 flex items-center justify-center shrink-0 border border-dark-100">
                    {s.bot_avatar_url ? (
                      <img src={s.bot_avatar_url} alt={s.business_name} className="w-full h-full object-contain p-0.5 bg-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-dark-500" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-bold text-xs text-dark-950 group-hover:text-primary-500 truncate leading-tight transition-colors">
                      {s.business_name}
                    </h4>
                    <span className="text-[9px] text-dark-500">
                      {language === 'en' ? s.category_name_en : s.category_name_ar}
                    </span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
