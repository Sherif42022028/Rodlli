const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Creating provider_logs table...")
    await sql.query(`
      CREATE TABLE IF NOT EXISTS provider_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        model VARCHAR(100),
        latency_ms INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        error_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    console.log("Creating index on provider_logs (merchant_id, created_at)...")
    await sql.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_logs_merchant_created 
      ON provider_logs (merchant_id, created_at DESC);
    `)

    console.log("Database provider_logs migration completed successfully!")
  } catch (error) {
    console.error("Failed to migrate provider_logs table:", error)
    process.exit(1)
  }
}

main()
