const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Creating orders table and adding order sync columns to merchants...")
    
    // 1. Add order sync metadata columns to merchants table
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS orders_sheet_id TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS orders_last_synced_at TIMESTAMPTZ")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS orders_sync_enabled BOOLEAN DEFAULT false")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS orders_last_sync_status TEXT")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS orders_last_sync_error TEXT")

    // 2. Create orders table
    await sql.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
        order_id_external TEXT NOT NULL,
        customer_name TEXT,
        product_name TEXT,
        status TEXT CHECK (status IN ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED')) DEFAULT 'PENDING',
        expected_date TEXT,
        notes TEXT,
        last_synced_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_merchant_order UNIQUE (merchant_id, order_id_external)
      );
    `)

    console.log("Orders table and schema migration executed successfully!")
  } catch (error) {
    console.error("Failed to execute orders migration:", error)
  }
}

main()
