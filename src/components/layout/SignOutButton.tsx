'use client'

import React from 'react'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
    >
      <LogOut className="w-4.5 h-4.5" />
      Sign Out
    </button>
  )
}
