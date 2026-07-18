const { neon } = require('@neondatabase/serverless')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding bot_avatar_url column to merchants table...")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS bot_avatar_url TEXT")
    console.log("Column added successfully!")
  } catch (error) {
    console.error("Failed to add column:", error)
  }
}

main()
