import { NextRequest, NextResponse } from 'next/server'

// Default verify token fallback if WHATSAPP_VERIFY_TOKEN environment variable is not set
const DEFAULT_VERIFY_TOKEN = 'rodlli_whatsapp_verify_2026'

/**
 * 1. GET: Meta Webhook Verification Handler
 * Meta calls this endpoint with hub.mode, hub.verify_token, and hub.challenge
 * when verifying the Webhook Callback URL in Meta Developer Dashboard.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('WhatsApp Webhook verified successfully!')
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('WhatsApp Webhook verification failed. Token mismatch.')
  return new Response('Forbidden', { status: 403 })
}

/**
 * 2. POST: Meta Incoming WhatsApp Message Handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('WhatsApp Webhook received event:', JSON.stringify(body, null, 2))

    // Acknowledge Meta immediately with 200 OK so Meta doesn't retry
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error: any) {
    console.error('WhatsApp Webhook POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
