import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMerchantByProfileId, getProducts, getFAQs, getWorkingHours, getUnansweredQuestions } from '@/app/actions/merchant'
import MerchantDashboardClient from './MerchantDashboardClient'

export default async function MerchantDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string }
  const merchant = await getMerchantByProfileId(user.id)

  // Redirect to onboarding if not done yet
  if (!merchant) {
    redirect('/merchant/onboarding')
  }

  // Fetch all related data
  const products = await getProducts(merchant.id)
  const faqs = await getFAQs(merchant.id)
  const workingHours = await getWorkingHours(merchant.id)
  const unansweredQuestions = await getUnansweredQuestions(merchant.id)

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
      />
    </div>
  )
}
