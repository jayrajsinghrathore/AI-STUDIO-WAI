// Script to initialize database tables
// Run with: npm run setup:db

const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Check your .env.local file.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log("Setting up database...")

    // Read SQL file
    const sqlPath = path.join(__dirname, "001_create_tables.sql")
    const sql = fs.readFileSync(sqlPath, "utf8")

    // Execute SQL
    const { error } = await supabase.rpc("exec", { query: sql })

    if (error) throw error

    console.log("✓ Database setup complete!")
  } catch (error) {
    console.error("Error setting up database:", error)
    process.exit(1)
  }
}

setupDatabase()
