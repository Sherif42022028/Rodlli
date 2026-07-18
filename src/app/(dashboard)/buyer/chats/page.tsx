import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getBuyerConversations } from '@/app/actions/buyer'
import ChatsClient from './ChatsClient'

export default async function BuyerChatsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { id: string }
  const conversations = await getBuyerConversations(user.id)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-dark-950 tracking-tight">
          My Conversations
        </h1>
        <p className="text-sm text-dark-600">
          Access your chat history and resume talking with store chatbots.
        </p>
      </div>

      <ChatsClient initialConversations={conversations} />
    </div>
  )
}
