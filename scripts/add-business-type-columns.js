const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding business type & dynamic attribute columns (product_type, in_stock, availability, extra_attributes) to products table...")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'physical'")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS availability TEXT")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS extra_attributes JSONB DEFAULT '{}'::jsonb")
    console.log("Product business type columns added successfully!")
  } catch (error) {
    console.error("Failed to add product business type columns:", error)
  }
}

main()
