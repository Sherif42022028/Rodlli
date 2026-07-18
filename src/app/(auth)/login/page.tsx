'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/layout/I18nProvider'
import { signIn } from 'next-auth/react'
import { Bot, Mail, Lock, AlertCircle, ArrowLeft, Globe } from 'lucide-react'

export default function Login() {
  const { language, changeLanguage } = useTranslation()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(
        result.error === 'CredentialsSignin'
          ? (language === 'en' ? 'Invalid email or password' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
          : result.error
      )
      setLoading(false)
    } else {
      const res = await fetch('/api/auth/session')
      const session = await res.json()
      if (session?.user?.account_type === 'merchant') {
        router.push('/merchant/dashboard')
      } else {
        router.push('/buyer/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm font-semibold text-dark-600 hover:text-primary-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'en' ? 'Back' : 'رجوع'}
        </Link>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dark-200 text-xs font-semibold bg-white hover:bg-cream-100 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
            <Bot className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-dark-950 tracking-tight">
          {language === 'en' ? 'Welcome back' : 'مرحباً بعودتك'}
        </h2>
        <p className="mt-2 text-center text-sm text-dark-600">
          {language === 'en' ? 'Or' : 'أو'}{' '}
          <Link href="/register" className="font-medium text-primary-500 hover:text-primary-600 transition-colors">
            {language === 'en' ? 'create a new account' : 'إنشاء حساب جديد'}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-3xl sm:px-10 border border-dark-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-dark-700 mb-1.5">
                {language === 'en' ? 'Email Address' : 'البريد الإلكتروني'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-dark-700 mb-1.5">
                {language === 'en' ? 'Password' : 'كلمة المرور'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-dark-700 font-medium">
                  {language === 'en' ? 'Remember me' : 'تذكرني'}
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
                  {language === 'en' ? 'Forgot your password?' : 'نسيت كلمة المرور؟'}
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (language === 'en' ? 'Signing in...' : 'جاري تسجيل الدخول...')
                  : (language === 'en' ? 'Sign in' : 'تسجيل الدخول')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
