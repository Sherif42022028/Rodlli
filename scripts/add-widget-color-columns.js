const { neon } = require('@neondatabase/serverless')

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding widget customization columns (widget_primary_color, widget_bubble_text_color, show_powered_by) to merchants table...")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS widget_primary_color TEXT DEFAULT '#F26B1D'")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS widget_bubble_text_color TEXT DEFAULT '#FFFFFF'")
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN DEFAULT true")
    console.log("Widget customization columns added successfully!")
  } catch (error) {
    console.error("Failed to add widget customization columns:", error)
  }
}

main()
