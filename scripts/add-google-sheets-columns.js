const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding Google Sheets sync columns to merchants table...")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_sheet_id TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_refresh_token TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS sheet_sync_enabled BOOLEAN DEFAULT false")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS last_sync_status TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS last_sync_error TEXT")
    console.log("Google Sheets columns added successfully!")
  } catch (error) {
    console.error("Failed to add Google Sheets columns:", error)
  }
}

main()
