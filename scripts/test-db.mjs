import pg from 'pg';
import fs from 'fs';
const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

async function runStorage() {
  await client.connect();
  let sql = fs.readFileSync('Migrate/10_storage_config.sql', 'utf8');
  console.log("Running 10_storage_config.sql...");
  
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
  for (let stmt of statements) {
    if (!stmt.trim()) continue;
    try {
      await client.query(stmt);
      console.log('SUCCESS');
    } catch(err) {
      console.log('FAILED:', err.message);
    }
  }
  await client.end();
}
runStorage().catch(e=>console.log(e.message));
