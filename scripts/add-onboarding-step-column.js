const { neon } = require('@neondatabase/serverless')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding onboarding_step column to merchants table...")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1")
    console.log("Setting onboarding_step = 4 for existing merchants...")
    await sql.query("UPDATE merchants SET onboarding_step = 4 WHERE onboarding_step IS NULL OR onboarding_step = 1")
    console.log("Migration completed successfully!")
  } catch (error) {
    console.error("Failed to migrate database:", error)
  }
}

main()
