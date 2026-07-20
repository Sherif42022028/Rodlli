import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getSecretKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.AUTH_SECRET || 'default_secret_key_must_be_32bytes_long!'
  // Ensure exactly 32 bytes for aes-256
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts a plain string token (e.g. refresh token).
 * Format of returned string: iv_hex:authTag_hex:encrypted_hex
 */
export function encryptToken(text: string): string {
  if (!text) return ''
  const key = getSecretKey()
  const iv = crypto.randomBytes(12) // GCM standard IV length is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypts an encrypted token string.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return ''
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      // Fallback for plain tokens if unencrypted
      return encryptedData
    }

    const [ivHex, authTagHex, encryptedHex] = parts
    const key = getSecretKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('decryptToken error:', error)
    return ''
  }
}
