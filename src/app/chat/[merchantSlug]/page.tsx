import React from 'react'
import { notFound } from 'next/navigation'
import { getMerchantBySlug } from '@/app/actions/chatbot'
import { getProducts } from '@/app/actions/merchant'
import { getTrendingStores } from '@/app/actions/buyer'
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
