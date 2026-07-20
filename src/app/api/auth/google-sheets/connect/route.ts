import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMerchantByProfileId } from '@/app/actions/merchant'
import { getGoogleAuthUrl } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const profileId = (session.user as any).id
    const merchant = await getMerchantByProfileId(profileId)

    if (!merchant) {
      return NextResponse.redirect(new URL('/merchant/dashboard', request.url))
    }

    const { searchParams } = new URL(request.url)
    const redirectTo = searchParams.get('redirect_to') || 'dashboard'

    const stateParam = Buffer.from(
      JSON.stringify({ merchantId: merchant.id, redirectTo })
    ).toString('base64url')

    const origin = new URL(request.url).origin
    const redirectUri = `${origin}/api/auth/google-sheets/callback`

    const authUrl = getGoogleAuthUrl(stateParam, redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Google Sheets Connect Route Error:', error)
    return NextResponse.redirect(new URL('/merchant/dashboard?error=connect_failed', request.url))
  }
}
