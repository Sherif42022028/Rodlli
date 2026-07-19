import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCategories, getTrendingStores, getStores, getRecommendedStores } from '@/app/actions/buyer'
import BuyerDashboardClient from './BuyerDashboardClient'

export default async function BuyerDashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string }

  // Fetch initial data
  const categories = await getCategories()
  const trendingStores = await getTrendingStores()
  const initialStores = await getStores()
  const recommendedStores = await getRecommendedStores(user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-dark-950 tracking-tight">
          Discover Smart Stores
        </h1>
        <p className="text-sm text-dark-600">
          Browse popular categories, find trending businesses, and chat with their smart assistants instantly.
        </p>
      </div>

      <BuyerDashboardClient 
        categories={categories}
        trendingStores={trendingStores}
        initialStores={initialStores}
        recommendedStores={recommendedStores}
      />
    </div>
  )
}
