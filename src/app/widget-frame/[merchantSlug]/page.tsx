import React from 'react'
import { notFound } from 'next/navigation'
import { getMerchantBySlug } from '@/app/actions/chatbot'
import { getProducts } from '@/app/actions/merchant'
import { auth } from '@/lib/auth'
import WidgetChatRoomClient from './WidgetChatRoomClient'

interface WidgetFrameProps {
  params: {
    merchantSlug: string
  }
}

export default async function WidgetFramePage({ params }: WidgetFrameProps) {
  const merchant = await getMerchantBySlug(params.merchantSlug)

  if (!merchant) {
    notFound()
  }

  const session = await auth()
  const buyerId = session?.user ? (session.user as any).id : null
  const products = await getProducts(merchant.id)

  return (
    <WidgetChatRoomClient 
      merchant={merchant} 
      products={products} 
      buyerId={buyerId}
    />
  )
}
