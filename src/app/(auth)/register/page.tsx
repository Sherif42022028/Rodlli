'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/layout/I18nProvider'
import { registerUser } from '@/app/actions/auth'
import { signIn } from 'next-auth/react'
import { Bot, Mail, Lock, User, Phone, Store, ShoppingBag, AlertCircle, ArrowLeft, Globe } from 'lucide-react'

export default function Register() {
  const { language, changeLanguage, t } = useTranslation()
  const router = useRouter()

  // Form Fields
  const [accountType, setAccountType] = useState<'merchant' | 'buyer'>('merchant')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  
  // Merchant Extra Field
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'ar' : 'en')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await registerUser({
      accountType,
      fullName,
      email,
      password,
      phoneNumber,
      businessName,
      businessCategory,
    })

    if (result.error) {
      setError(
        result.error === 'Email already registered'
          ? (language === 'en' ? 'Email already registered' : 'البريد الإلكتروني مسجل بالفعل')
          : result.error
      )
      setLoading(false)
      return
    }

    // Automatically sign in the user
    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (signInResult?.error) {
      setError(signInResult.error)
      setLoading(false)
    } else {
      if (accountType === 'merchant') {
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
          {language === 'en' ? 'Create a new account' : 'إنشاء حساب جديد'}
        </h2>
        <p className="mt-2 text-center text-sm text-dark-600">
          {language === 'en' ? 'Already have an account?' : 'هل لديك حساب بالفعل؟'}{' '}
          <Link href="/login" className="font-medium text-primary-500 hover:text-primary-600 transition-colors">
            {language === 'en' ? 'Sign in here' : 'سجل الدخول من هنا'}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-3xl sm:px-10 border border-dark-100">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Account Type Toggle */}
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-3">
                {language === 'en' ? 'I want to join as a' : 'أريد الانضمام كـ'}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAccountType('merchant')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${
                    accountType === 'merchant'
                      ? 'border-primary-500 bg-primary-50/50 text-primary-700 ring-2 ring-primary-500/10'
                      : 'border-dark-200 hover:bg-cream-50 text-dark-600'
                  }`}
                >
                  <Store className="w-6 h-6" />
                  <span className="text-xs font-bold">{language === 'en' ? 'Merchant / Business' : 'تاجر / نشاط تجاري'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('buyer')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${
                    accountType === 'buyer'
                      ? 'border-primary-500 bg-primary-50/50 text-primary-700 ring-2 ring-primary-500/10'
                      : 'border-dark-200 hover:bg-cream-50 text-dark-600'
                  }`}
                >
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-xs font-bold">{language === 'en' ? 'Buyer / Shopper' : 'مشتري / متسوق'}</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-dark-700 mb-1.5">
                {language === 'en' ? 'Full Name' : 'الاسم الكامل'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder={language === 'en' ? 'John Doe' : 'جون دو'}
                />
              </div>
            </div>

            {/* Email */}
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-dark-700 mb-1.5">
                {language === 'en' ? 'Phone Number' : 'رقم الهاتف'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="+20 100 000 0000"
                />
              </div>
            </div>

            {/* Merchant Extra Fields */}
            {accountType === 'merchant' && (
              <>
                <div>
                  <label htmlFor="businessName" className="block text-sm font-semibold text-dark-700 mb-1.5">
                    {t('merchant.businessName')}
                  </label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="block w-full px-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                    placeholder={language === 'en' ? 'My Awesome Coffee Store' : 'متجر قهوتي المتميز'}
                  />
                </div>

                <div>
                  <label htmlFor="businessCategory" className="block text-sm font-semibold text-dark-700 mb-1.5">
                    {t('merchant.category')}
                  </label>
                  <input
                    id="businessCategory"
                    name="businessCategory"
                    type="text"
                    required
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    className="block w-full px-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                    placeholder={language === 'en' ? 'Cafes & Restaurants' : 'مطاعم ومقاهي'}
                  />
                </div>
              </>
            )}

            {/* Password */}
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-xl bg-cream-50/30 placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-dark-900 hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (language === 'en' ? 'Creating account...' : 'جاري إنشاء الحساب...')
                  : (language === 'en' ? 'Sign up' : 'إنشاء حساب')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
