import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMerchantByProfileId } from '@/app/actions/merchant'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string }
  const merchant = await getMerchantByProfileId(user.id)

  const step = merchant?.onboarding_step || 1
  if (merchant && merchant.onboarding_step === 4) {
    redirect('/merchant/dashboard')
  } else {
    redirect(`/onboarding/${step}`)
  }
}
