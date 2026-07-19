const { neon } = require('@neondatabase/serverless')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding is_confident column to messages table...")
    await sql.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_confident BOOLEAN DEFAULT true")
    
    console.log("Creating tool_call_logs table...")
    await sql.query(`
      CREATE TABLE IF NOT EXISTS tool_call_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        tool_name TEXT NOT NULL,
        tool_input JSONB,
        matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    console.log("Creating contact_requests table...")
    await sql.query(`
      CREATE TABLE IF NOT EXISTS contact_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    console.log("Database analytics migration completed successfully!")
  } catch (error) {
    console.error("Failed to migrate database:", error)
  }
}

main()
