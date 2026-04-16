import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

const schemaFiles = [
  "01_enums.sql",
  "02_schema_full.sql",
  "03_rls_policies.sql",
  "05_functions.sql",
  "06_triggers.sql"
];

async function runSchema() {
  await client.connect();
  console.log("Connected to the database. Running core schemas...");

  for (const file of schemaFiles) {
    const filePath = path.join(process.cwd(), "Migrate", file);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n--- Executing ${file} ---`);
    let sql = fs.readFileSync(filePath, "utf8");

    // Remove pg_dump meta commands
    const rawLines = sql.split('\n');
    let cleanedSql = '';
    for (let i = 0; i < rawLines.length; i++) {
        if (!rawLines[i].startsWith('\\')) {
            cleanedSql += rawLines[i] + '\n';
        }
    }

    // Split by statement
    const statements = cleanedSql.split(/;\s*?\n/);
    console.log(`Parsed ${statements.length} statements for ${file}.`);

    let success = 0;
    let failed = 0;

    for (let stmt of statements) {
      if (!stmt.trim()) continue;
      try {
        await client.query(stmt);
        success++;
      } catch (err) {
        failed++;
        // Ignore "already exists" errors to allow partial applies
        if (err.message.includes('already exists') || err.code === '42710' || err.code === '42P07') {
          // silent ignore
        } else {
          fs.appendFileSync('schema-errors.log', `[${file}] ERROR: ${err.message}\nSTMT: ${stmt.substring(0, 100)}\n\n`);
        }
      }
    }
    console.log(`${file} completed: ${success} successful, ${failed} failed (Check schema-errors.log for non-exist errors).`);
  }

  await client.end();
}

runSchema();
