const { neon } = require('@neondatabase/serverless')

const connectionString = "postgresql://neondb_owner:npg_6QVyUOAI5mbw@ep-falling-resonance-zaj2e6d4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function main() {
  const sql = neon(connectionString)
  try {
    console.log("Adding columns to merchants table...")
    
    // Add category_id reference
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL")
    
    // Add is_online indicator
    await sql.query("ALTER TABLE merchants ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true")
    
    console.log("Columns added successfully! Seeding categories...")

    // Insert categories if not exists
    const categoriesToSeed = [
      { nameEn: 'Food & Drinks', nameAr: 'أغذية ومشروبات', icon: 'utensils', displayOrder: 1 },
      { nameEn: 'Fashion & Clothing', nameAr: 'ملابس وموضة', icon: 'shirt', displayOrder: 2 },
      { nameEn: 'Health & Beauty', nameAr: 'صحة وجمال', icon: 'heart', displayOrder: 3 },
      { nameEn: 'Electronics', nameAr: 'إلكترونيات', icon: 'laptop', displayOrder: 4 },
      { nameEn: 'Home & Services', nameAr: 'خدمات ومنزل', icon: 'home', displayOrder: 5 }
    ]

    for (const cat of categoriesToSeed) {
      const exists = await sql.query("SELECT id FROM categories WHERE name_en = $1", [cat.nameEn])
      if (!exists || exists.length === 0) {
        await sql.query(`
          INSERT INTO categories (name_en, name_ar, icon, display_order)
          VALUES ($1, $2, $3, $4)
        `, [cat.nameEn, cat.nameAr, cat.icon, cat.displayOrder])
      }
    }

    console.log("Categories seeded successfully!")

    // Update existing merchants to point to first category 'Food & Drinks' if category_id is null
    const firstCatResult = await sql.query("SELECT id FROM categories WHERE name_en = 'Food & Drinks' LIMIT 1")
    if (firstCatResult && firstCatResult.length > 0) {
      const catId = firstCatResult[0].id
      await sql.query("UPDATE merchants SET category_id = $1 WHERE category_id IS NULL", [catId])
      console.log("Updated default category for existing stores.")
    }

  } catch (error) {
    console.error("Migration failed:", error)
  }
}

main()
