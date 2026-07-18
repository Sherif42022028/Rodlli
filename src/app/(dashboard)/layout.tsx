import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Bot, LayoutDashboard, LogOut, Globe, User, MessageSquare } from 'lucide-react'
import SignOutButton from '@/components/layout/SignOutButton'
import DashboardLangToggle from '@/components/layout/DashboardLangToggle'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as { name?: string; email?: string; account_type?: string }

  return (
    <div className="min-h-screen bg-cream-50 text-dark-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-dark-100 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 border-b border-dark-100 flex items-center px-6 gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-dark-900 to-primary-500 bg-clip-text text-transparent">
            Rodlli
          </span>
        </div>

        {/* User profile brief */}
        <div className="p-4 border-b border-dark-100 bg-cream-50/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
            {user.name ? user.name[0].toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-dark-950 truncate">{user.name || 'User'}</h4>
            <span className="text-[10px] text-dark-500 capitalize">{user.account_type || 'Buyer'}</span>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 p-4 space-y-1 text-sm font-medium">
          {user.account_type === 'merchant' ? (
            <>
              <Link
                href="/merchant/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-100 text-dark-700 hover:text-dark-950 transition-colors"
              >
                <LayoutDashboard className="w-4.5 h-4.5 text-dark-500" />
                Merchant Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/buyer/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-100 text-dark-700 hover:text-dark-950 transition-colors"
              >
                <LayoutDashboard className="w-4.5 h-4.5 text-dark-500" />
                Buyer Hub
              </Link>

              <Link
                href="/buyer/chats"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-100 text-dark-700 hover:text-dark-950 transition-colors"
              >
                <MessageSquare className="w-4.5 h-4.5 text-dark-500" />
                My Conversations
              </Link>
            </>
          )}
        </nav>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-dark-100 space-y-2">
          {/* Client-side language toggle and signout */}
          <DashboardLangToggle />
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Content Header */}
        <header className="h-16 bg-white border-b border-dark-100 flex items-center justify-between px-6 md:px-8 shrink-0">
          <h2 className="text-md font-bold text-dark-950">
            {user.account_type === 'merchant' ? 'Merchant Portal' : 'Buyer Portal'}
          </h2>
          <div className="text-xs text-dark-500">
            Logged in as: <span className="font-semibold text-dark-700">{user.email}</span>
          </div>
        </header>

        {/* Inner Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
