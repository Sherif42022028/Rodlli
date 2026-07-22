const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Clearing old demo QR codes from merchants table...")
    await sql.query("UPDATE merchants SET whatsapp_qr_code = NULL, whatsapp_status = 'disconnected' WHERE whatsapp_qr_code LIKE '%qrserver.com%' OR whatsapp_qr_code LIKE '%rodlli_demo%'")
    console.log("Old demo QR codes cleared successfully!")
  } catch (error) {
    console.error("Failed to clear demo QR codes:", error)
  }
}

main()
