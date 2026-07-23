import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_VERIFY_TOKEN = 'rodlli_whatsapp_verify_2026'

/**
 * 1. GET: Webhook Verification Handler
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new Response('Forbidden', { status: 403 })
}

/**
 * 2. POST: Webhook Event Handler
 */
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
