const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  console.log("Connecting to Neon database and running migration...")
  const sql = neon(connectionString)
  
  const schemaPath = path.join(process.cwd(), 'docs', 'database', 'schema.sql')
  const sqlContent = fs.readFileSync(schemaPath, 'utf8')

  // Clean and split SQL commands by semicolon
  const rawCommands = sqlContent.split(';')
  
  let successCount = 0
  for (let rawCmd of rawCommands) {
    // Strip single-line (-- ...) and multi-line comments
    const cmd = rawCmd
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()

    if (cmd.length > 0) {
      try {
        await sql.query(cmd)
        successCount++
      } catch (error) {
        console.error("Migration failed on command:\n", cmd)
        console.error("Error details:", error)
        process.exit(1)
      }
    }
  }

  console.log(`Migration completed successfully! ${successCount} SQL statements executed on Neon PostgreSQL.`)
}

main()
