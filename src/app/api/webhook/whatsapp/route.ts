import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { queryChatbot } from '@/app/actions/chatbot'
import { getOrCreateConversation, saveChatMessage } from '@/app/actions/buyer'
import { sendWhatsAppTextMessage } from '@/lib/evolution-api'

const DEFAULT_VERIFY_TOKEN = 'rodlli_whatsapp_verify_2026'

/**
 * 1. GET: Meta Cloud API Webhook Verification Handler
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('WhatsApp Meta Webhook verified successfully!')
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new Response('Forbidden', { status: 403 })
}

/**
 * 2. POST: Evolution API & Meta Incoming WhatsApp Message Handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('WhatsApp Webhook received event:', body?.event || 'generic', JSON.stringify(body))

    const event = body?.event
    const instance = body?.instance || body?.instanceName

    // Evolution API Event 1: QR Code Updated
    if (event === 'qrcode.updated' && instance) {
      const qrCode = body?.data?.qrcode?.base64 || body?.data?.qrcode?.code
      if (qrCode) {
        await db.execute(
          sql`UPDATE merchants 
              SET whatsapp_qr_code = ${qrCode}, 
                  whatsapp_status = 'connecting', 
                  updated_at = NOW() 
              WHERE whatsapp_instance_name = ${instance}`
        )
      }
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Evolution API Event 2: Connection Update
    if (event === 'connection.update' && instance) {
      const state = body?.data?.state || body?.data?.status
      if (state) {
        const cleanState = state === 'open' ? 'open' : (state === 'close' ? 'disconnected' : 'connecting')
        await db.execute(
          sql`UPDATE merchants 
              SET whatsapp_status = ${cleanState}, 
                  whatsapp_qr_code = ${cleanState === 'open' ? null : sql`whatsapp_qr_code`}, 
                  updated_at = NOW() 
              WHERE whatsapp_instance_name = ${instance}`
        )
      }
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Evolution API Event 3: Incoming Message (messages.upsert)
    if (event === 'messages.upsert' && instance && body?.data) {
      const messageData = body?.data?.message || body?.data
      const key = body?.data?.key || messageData?.key

      // Process only messages sent by buyers (fromMe === false)
      if (key && key.fromMe === false) {
        const remoteJid = key.remoteJid || ''
        const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')
        
        const userText = messageData?.conversation || 
                         messageData?.extendedTextMessage?.text || 
                         messageData?.text || 
                         body?.data?.body || ''

        if (senderPhone && userText.trim()) {
          // Look up merchant associated with this instance
          const res = await db.execute(
            sql`SELECT id, business_name FROM merchants WHERE whatsapp_instance_name = ${instance}`
          )
          const merchant = (res.rows as unknown as any[])[0]

          if (merchant) {
            const guestSessionId = `wa_${senderPhone}`
            const convId = await getOrCreateConversation(merchant.id, null, guestSessionId)

            if (convId) {
              // Save user message to database
              await saveChatMessage(convId, 'buyer', userText)

              // Query Hybrid Engine
              const botRes = await queryChatbot(userText, merchant.id, 'ar', convId)
              const replyText = botRes.response?.text || 'عذراً، فشل معالجة الطلب حالياً.'
              const isConfident = botRes.response?.confident !== false

              // Save bot reply to database
              await saveChatMessage(convId, 'bot', replyText, isConfident)

              // Send WhatsApp message back to buyer via Evolution API
              await sendWhatsAppTextMessage(instance, senderPhone, replyText)
            }
          }
        }
      }
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error: any) {
    console.error('WhatsApp Webhook POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
