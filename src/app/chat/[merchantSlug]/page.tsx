import React from 'react'
import { notFound } from 'next/navigation'
import { getMerchantBySlug } from '@/app/actions/chatbot'
import { getProducts } from '@/app/actions/merchant'
import { getTrendingStores, incrementInterest } from '@/app/actions/buyer'
import { INTEREST_WEIGHTS } from '@/lib/constants'
import { auth } from '@/lib/auth'
import ChatRoomClient from './ChatRoomClient'

interface ChatPageProps {
  params: {
    merchantSlug: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const merchant = await getMerchantBySlug(params.merchantSlug)

  if (!merchant) {
    notFound()
  }

  const session = await auth()
  const buyerId = session?.user ? (session.user as any).id : null

  if (buyerId && merchant.category_id) {
    // Increment interest asynchronously without blocking page render
    incrementInterest(buyerId, merchant.category_id, INTEREST_WEIGHTS.OPEN_CHAT).catch(err => {
      console.error('Failed to increment interest on page open:', err)
    })
  }

  const products = await getProducts(merchant.id)
  const trendingStores = await getTrendingStores()

  return (
    <ChatRoomClient 
      merchant={merchant} 
      products={products} 
      trendingStores={trendingStores}
      buyerId={buyerId}
    />
  )
}
