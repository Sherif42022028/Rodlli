/**
 * Evolution API Client Utility
 * Manages WhatsApp instances, QR Code retrieval, session status, and message sending.
 */

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11'
const PUBLIC_APP_URL = (process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000').replace(/\/$/, '')

const headers = {
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_API_KEY,
}

/**
 * 1. Create or initialize a new WhatsApp Instance on Evolution API
 */
export async function createWhatsAppInstance(instanceName: string) {
  try {
    const webhookUrl = `${PUBLIC_APP_URL}/api/webhook/whatsapp`

    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName,
        token: `token_${instanceName}`,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: [
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            'MESSAGES_UPSERT',
            'SEND_MESSAGE'
          ]
        }
      }),
    })

    const data = await response.json()
    if (!response.ok && data?.error !== 'Instance already exists' && data?.message !== 'Instance already exists') {
      console.error('Evolution API createInstance error:', data)
      return { success: false, error: data?.message || data?.error || 'Failed to create instance' }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('createWhatsAppInstance exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 2. Fetch/connect to get the QR code for scanning
 */
export async function getWhatsAppQRCode(instanceName: string) {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })

    const data = await response.json()
    if (response.ok) {
      const qrCodeBase64 = data?.base64 || data?.qrcode?.base64 || data?.code || data?.qrcode?.code || (typeof data === 'string' ? data : null)
      if (qrCodeBase64) {
        return { success: true, qrCode: qrCodeBase64, isFallback: false, count: data?.count || 0 }
      }
    }
  } catch (error: any) {
    console.warn('getWhatsAppQRCode warning (Evolution API server unreachable):', error.message)
  }

  // Fallback QR Code generator for UI Demo testing if EVOLUTION_API_URL is not connected yet
  const fallbackQR = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=rodlli_demo_instance_${instanceName}`
  return { success: true, qrCode: fallbackQR, isFallback: true }
}

/**
 * 3. Fetch connection state of a WhatsApp instance
 */
export async function getWhatsAppConnectionState(instanceName: string) {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })

    const data = await response.json()
    if (!response.ok) {
      return { success: false, state: 'disconnected' }
    }

    const state = data?.instance?.state || data?.state || 'disconnected'
    return { success: true, state }
  } catch (error: any) {
    console.error('getWhatsAppConnectionState exception:', error)
    return { success: false, state: 'disconnected' }
  }
}

/**
 * 4. Disconnect / Logout a WhatsApp instance
 */
export async function disconnectWhatsAppInstance(instanceName: string) {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers,
    })

    const data = await response.json()
    return { success: response.ok, data }
  } catch (error: any) {
    console.error('disconnectWhatsAppInstance exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 5. Send a text message via WhatsApp Cloud / Baileys instance
 */
export async function sendWhatsAppTextMessage(instanceName: string, recipientNumber: string, text: string) {
  try {
    // Sanitize number (remove + or spaces or @c.us suffix)
    const sanitizedNumber = recipientNumber.replace(/[^0-9]/g, '')

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: sanitizedNumber,
        text,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('sendWhatsAppTextMessage error response:', data)
      return { success: false, error: data?.message || 'Failed to send WhatsApp message' }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('sendWhatsAppTextMessage exception:', error)
    return { success: false, error: error.message }
  }
}
