const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding WhatsApp integration columns to merchants table...")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT UNIQUE")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_instance_id TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'disconnected'")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_qr_code TEXT")
    console.log("WhatsApp integration columns added successfully!")
  } catch (error) {
    console.error("Failed to add WhatsApp integration columns:", error)
  }
}

main()
