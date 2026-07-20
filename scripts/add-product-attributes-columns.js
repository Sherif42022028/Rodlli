const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding extended attributes columns (colors, sizes, category_name, attributes) to products table...")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_name TEXT")
    await sql.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB")
    console.log("Product attributes columns added successfully!")
  } catch (error) {
    console.error("Failed to add product attributes columns:", error)
  }
}

main()
