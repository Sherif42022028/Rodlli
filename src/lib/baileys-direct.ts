import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { queryChatbot } from '@/app/actions/chatbot'
import { getOrCreateConversation, saveChatMessage } from '@/app/actions/buyer'
import path from 'path'
import fs from 'fs'

// In-memory active sockets and QR codes
const activeSockets: Record<string, any> = {}
const qrCodesMemory: Record<string, string> = {}

/**
 * Initialize or connect direct Baileys WhatsApp Socket inside Next.js
 */
export async function initDirectBaileysSession(merchantId: string, instanceName: string) {
  try {
    const authFolder = path.join(process.cwd(), '.baileys_auth', instanceName)
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder)

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Rodlli AI Bot', 'Chrome', '1.0.0'],
    })

    activeSockets[instanceName] = sock

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        // Convert authentic WhatsApp Baileys payload string to base64 Data URL using `qrcode`
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
        qrCodesMemory[instanceName] = qrDataUrl

        await db.execute(
          sql`UPDATE merchants 
              SET whatsapp_status = 'connecting', 
                  whatsapp_qr_code = ${qrDataUrl}, 
                  updated_at = NOW() 
              WHERE id = ${merchantId}`
        )
      }

      if (connection === 'open') {
        const phone = sock.user?.id ? sock.user.id.split(':')[0] : null
        delete qrCodesMemory[instanceName]

        await db.execute(
          sql`UPDATE merchants 
              SET whatsapp_status = 'open', 
                  whatsapp_phone = ${phone}, 
                  whatsapp_qr_code = NULL, 
                  updated_at = NOW() 
              WHERE id = ${merchantId}`
        )
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
        if (shouldReconnect) {
          initDirectBaileysSession(merchantId, instanceName)
        } else {
          delete activeSockets[instanceName]
          delete qrCodesMemory[instanceName]
          await db.execute(
            sql`UPDATE merchants 
                SET whatsapp_status = 'disconnected', 
                    whatsapp_qr_code = NULL, 
                    whatsapp_phone = NULL, 
                    updated_at = NOW() 
                WHERE id = ${merchantId}`
          )
        }
      }
    })

    // Listen for incoming buyer messages
    sock.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            const remoteJid = msg.key.remoteJid || ''
            const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/[^0-9]/g, '')

            const userText = msg.message.conversation ||
                             msg.message.extendedTextMessage?.text ||
                             ''

            if (senderPhone && userText.trim()) {
              const guestSessionId = `wa_${senderPhone}`
              const convId = await getOrCreateConversation(merchantId, null, guestSessionId)

              if (convId) {
                await saveChatMessage(convId, 'buyer', userText)

                const botRes = await queryChatbot(userText, merchantId, 'ar', convId)
                const replyText = botRes.response?.text || 'عذراً، فشل معالجة الطلب حالياً.'
                const isConfident = botRes.response?.confident !== false

                await saveChatMessage(convId, 'bot', replyText, isConfident)

                // Send reply back to buyer on WhatsApp
                await sock.sendMessage(remoteJid, { text: replyText })
              }
            }
          }
        }
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('initDirectBaileysSession error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get active QR code memory data URL
 */
export async function getDirectBaileysQRCode(instanceName: string) {
  return qrCodesMemory[instanceName] || null
}
