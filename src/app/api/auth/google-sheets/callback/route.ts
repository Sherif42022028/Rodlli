import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { exchangeCodeForTokens } from '@/lib/google-sheets'
import { encryptToken } from '@/lib/encryption'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  let redirectTo = 'dashboard'
  let merchantId: string | null = null

  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
      merchantId = decodedState.merchantId
      redirectTo = decodedState.redirectTo || 'dashboard'
    } catch (e) {
      console.error('Failed to parse state param:', e)
    }
  }

  const getTargetUrl = (param: string) => {
    if (redirectTo === 'onboarding') {
      return `/onboarding/2?${param}`
    }
    return `/merchant/dashboard?tab=products&${param}`
  }

  if (oauthError || !code) {
    console.error('Google OAuth callback error parameter:', oauthError)
    return NextResponse.redirect(new URL(getTargetUrl('error=google_oauth_denied'), request.url))
  }

  if (!merchantId) {
    return NextResponse.redirect(new URL(getTargetUrl('error=invalid_state'), request.url))
  }

  try {
    const origin = new URL(request.url).origin
    const redirectUri = `${origin}/api/auth/google-sheets/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    
    if (!tokens.refresh_token) {
      console.warn('Google OAuth returned no refresh_token. Prompt=consent should ensure this.')
    } else {
      const encryptedRefreshToken = encryptToken(tokens.refresh_token)
      await db.execute(
        sql`UPDATE merchants 
            SET google_refresh_token = ${encryptedRefreshToken}, 
                updated_at = NOW() 
            WHERE id = ${merchantId}`
      )
    }

    return NextResponse.redirect(new URL(getTargetUrl('sheet_connected=true'), request.url))
  } catch (error: any) {
    console.error('Google OAuth callback handler error:', error)
    return NextResponse.redirect(new URL(getTargetUrl(`error=${encodeURIComponent(error.message || 'token_exchange_failed')}`), request.url))
  }
}
