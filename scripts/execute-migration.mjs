import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Read db URL from arguments or environment
const dbUrl = process.argv[2] || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Please provide the database connection string as an argument.");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
});

const migrationFiles = [
  "01_enums.sql",
  "02_schema_full.sql",
  "05_functions.sql",
  "06_triggers.sql",
  "03_rls_policies.sql",
  "04_data_inserts_part1.sql",
  "04_data_inserts_part2.sql",
  "04_data_inserts_part3.sql",
  "04_data_inserts_part4.sql",
  "10_storage_config.sql"
];

async function run() {
  try {
    await client.connect();
    console.log("Connected to the database. Running migrations...");

    for (const file of migrationFiles) {
      console.log(`\nExecuting ${file}...`);
      const filePath = path.join(process.cwd(), "Migrate", file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`File ${filePath} not found, skipping.`);
        continue;
      }
      
      const sql = fs.readFileSync(filePath, "utf8");
      
      // Some large inserts might need to be run, we'll run them as a single query text
      await client.query(sql);
      console.log(`Successfully completed ${file}.`);
    }

    console.log("\nAll migrations applied successfully!");
  } catch (error) {
    console.error("Error executing migrations:", error);
  } finally {
    await client.end();
  }
}

run();
