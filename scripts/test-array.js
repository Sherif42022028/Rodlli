const { neon } = require('@neondatabase/serverless')
const { drizzle } = require('drizzle-orm/neon-http')
const { sql } = require('drizzle-orm')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const connection = neon(connectionString)
  const db = drizzle(connection)

  try {
    const imagesArray = ['https://fflow-luxry.vercel.app/product/black-oversize-tshirt']
    const arrayLiteral = '{' + imagesArray.map(img => `"${img}"`).join(',') + '}'
    console.log("Formatted array literal:", arrayLiteral)

    const result = await db.execute(sql`
      INSERT INTO products (merchant_id, name, price, description, image_urls)
      VALUES (
        '895bddcf-c3ff-45b9-8662-3d190518c664', 
        'Test Product', 
        99.99, 
        'Test desc', 
        ${arrayLiteral}
      )
      RETURNING id
    `)
    console.log("Insert success! Result:", result)

    // Clean up
    if (result.rows && result.rows.length > 0) {
      await db.execute(sql`DELETE FROM products WHERE id = ${result.rows[0].id}`)
      console.log("Cleaned up test product.")
    }

  } catch (error) {
    console.error("Test failed with error:")
    console.error(error)
  }
}

main()
