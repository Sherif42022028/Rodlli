const { neon } = require('@neondatabase/serverless')
const { drizzle } = require('drizzle-orm/neon-http')
const { sql } = require('drizzle-orm')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const connection = neon(connectionString)
  const db = drizzle(connection)

  try {
    console.log("Testing db.execute...")
    const result = await db.execute(sql`SELECT id FROM profiles LIMIT 1`)
    console.log("Result type:", typeof result)
    console.log("Is array?", Array.isArray(result))
    console.log("Raw Result:", result)
  } catch (error) {
    console.error("Execute failed:", error)
  }
}

main()
