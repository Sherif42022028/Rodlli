const { neon } = require('@neondatabase/serverless')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Testing connection...")
    
    // Check if tables exist in the public schema
    console.log("Listing tables:")
    const tables = await sql.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    console.log(tables)

    // Try a test select
    console.log("Testing query on profiles...")
    const testQuery = await sql.query("SELECT id FROM profiles WHERE email = 'test@example.com'")
    console.log("Query success! Result:", testQuery)

  } catch (error) {
    console.error("DB Test failed with error:")
    console.error(error)
  }
}

main()
