'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function registerUser(data: Record<string, string>) {
  const { accountType, fullName, email, password, phoneNumber, businessName, businessCategory } = data

  if (!email || !password || !fullName) {
    return { error: 'Missing required fields' }
  }

  try {
    const existing = await db.execute(
      sql`SELECT id FROM profiles WHERE email = ${email}`
    )
    const rows = existing.rows as unknown as Array<{ id: string }>
    if (rows && rows.length > 0) {
      return { error: 'Email already registered' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const profileResult = await db.execute(
      sql`INSERT INTO profiles (email, password, full_name, phone_number, account_type) 
          VALUES (${email}, ${hashedPassword}, ${fullName}, ${phoneNumber}, ${accountType})
          RETURNING id`
    )
    
    const profileRows = profileResult.rows as unknown as Array<{ id: string }>
    if (!profileRows || profileRows.length === 0) {
      return { error: 'Failed to create user profile.' }
    }
    const profileId = profileRows[0].id

    if (accountType === 'merchant') {
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const chatbotLink = `/chat/${slug}`

      await db.execute(
        sql`INSERT INTO merchants (profile_id, business_name, business_category, slug, chatbot_link)
            VALUES (${profileId}, ${businessName}, ${businessCategory}, ${slug}, ${chatbotLink})`
      )
    }

    return { success: true }
  } catch (error) {
    console.error('Registration action error:', error)
    return { error: (error as Error).message || 'Something went wrong' }
  }
}
