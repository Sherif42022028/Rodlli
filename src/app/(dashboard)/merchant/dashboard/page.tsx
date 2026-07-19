import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMerchantByProfileId, getProducts, getFAQs, getWorkingHours, getUnansweredQuestions } from '@/app/actions/merchant'
import { getAnalyticsOverview, getAnalyticsTrend, getTopProducts, getTopQuestions, getConversionRate } from '@/app/actions/analytics'
import MerchantDashboardClient from './MerchantDashboardClient'

export default async function MerchantDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string }
  const merchant = await getMerchantByProfileId(user.id)

  // Redirect to onboarding if not done yet
  if (!merchant || !merchant.onboarding_step || merchant.onboarding_step < 4) {
    const step = merchant?.onboarding_step || 1
    redirect(`/onboarding/${step}`)
  }

  // Fetch all related data
  const products = await getProducts(merchant.id)
  const faqs = await getFAQs(merchant.id)
  const workingHours = await getWorkingHours(merchant.id)
  const unansweredQuestions = await getUnansweredQuestions(merchant.id)
  
  // Fetch Analytics data
  const overview = await getAnalyticsOverview(merchant.id)
  const initialTrend = await getAnalyticsTrend(merchant.id, '7d')
  const topProducts = await getTopProducts(merchant.id, 5)
  const topQuestions = await getTopQuestions(merchant.id, 5)
  const conversionStats = await getConversionRate(merchant.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-dark-950 tracking-tight">
          {merchant.business_name}
        </h1>
        <p className="text-sm text-dark-600">
          Manage your products, updates, FAQs, and retrieve your chatbot storefront link.
        </p>
      </div>

      <MerchantDashboardClient 
        merchant={merchant} 
        initialProducts={products} 
        initialFAQs={faqs} 
        initialHours={workingHours} 
        initialUnanswered={unansweredQuestions}
        analyticsOverview={overview}
        analyticsTrend={initialTrend}
        analyticsTopProducts={topProducts}
        analyticsTopQuestions={topQuestions}
        analyticsConversion={conversionStats}
      />
    </div>
  )
}
