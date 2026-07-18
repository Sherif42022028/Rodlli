import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMerchantByProfileId } from '@/app/actions/merchant'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string }
  const merchant = await getMerchantByProfileId(user.id)

  // If already onboarded, redirect straight to dashboard
  if (merchant) {
    redirect('/merchant/dashboard')
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold text-dark-950 tracking-tight mb-2">
          Set Up Your Business
        </h1>
        <p className="text-sm text-dark-600">
          Tell us about your business to generate your smart storefront and chatbot link.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-dark-100 p-6 md:p-8 shadow-sm">
        <OnboardingForm profileId={user.id} />
      </div>
    </div>
  )
}
