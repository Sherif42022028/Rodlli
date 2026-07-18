const { neon } = require('@neondatabase/serverless')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Creating unanswered_questions table...")
    await sql.query(`
      CREATE TABLE IF NOT EXISTS unanswered_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        is_resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log("Table created successfully!")
  } catch (error) {
    console.error("Failed to create table:", error)
  }
}

main()
