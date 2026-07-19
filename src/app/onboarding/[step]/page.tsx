import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMerchantByProfileId, getProducts, getFAQs } from '@/app/actions/merchant'
import { getCategories } from '@/app/actions/buyer'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingStepPage({
  params,
}: {
  params: { step: string }
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string; account_type?: string }
  if (user.account_type !== 'merchant') {
    redirect('/buyer/dashboard')
  }

  const merchant = await getMerchantByProfileId(user.id)
  if (!merchant) {
    // If somehow a merchant profile exists but no merchant record, redirect to login
    redirect('/login')
  }

  const currentStep = merchant.onboarding_step || 1
  const targetStep = parseInt(params.step, 10)

  // Validate step range
  if (isNaN(targetStep) || targetStep < 1 || targetStep > 4) {
    redirect(`/onboarding/${currentStep}`)
  }

  // Navigation Guards:
  // 1. If onboarding is complete (step 4) and they try to access steps 1-3, send them to dashboard
  if (currentStep === 4 && targetStep < 4) {
    redirect('/merchant/dashboard')
  }

  // 2. If they attempt to jump forward past their allowed step, redirect to current step
  if (targetStep > currentStep) {
    redirect(`/onboarding/${currentStep}`)
  }

  // Fetch data needed for the wizard steps
  const categories = await getCategories()
  const products = await getProducts(merchant.id)
  const faqs = await getFAQs(merchant.id)

  return (
    <div className="min-h-screen bg-cream-50/50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-xl mx-auto w-full">
        <OnboardingWizard
          merchant={merchant}
          categories={categories}
          initialProducts={products}
          initialFAQs={faqs}
          step={targetStep}
          currentStep={currentStep}
        />
      </div>
    </div>
  )
}
