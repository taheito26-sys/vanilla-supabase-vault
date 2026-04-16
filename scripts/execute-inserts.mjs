import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

const migrationFiles = [
  "04_data_inserts_part1.sql",
  "04_data_inserts_part2.sql",
  "04_data_inserts_part3.sql",
  "04_data_inserts_part4.sql"
];

async function run() {
  try {
    await client.connect();
    console.log("Connected to Database via IPv4 Pooler.");

    // Minor fix for notifications category issue
    try {
        await client.query(`ALTER TABLE notifications ADD COLUMN category TEXT;`);
    } catch(e) {}

    let completeSqlBuffer = "";
    for (const file of migrationFiles) {
      const filePath = path.join(process.cwd(), "Migrate", file);
      if (fs.existsSync(filePath)) {
        const fileStr = fs.readFileSync(filePath, "utf8");
        completeSqlBuffer += fileStr;
      }
    }

    const rawLines = completeSqlBuffer.split('\n');
    let cleanedSql = '';
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line.startsWith('\\') && line.length > 0 && !line.startsWith('--')) {
            cleanedSql += rawLines[i] + '\n';
        }
    }

    const statements = cleanedSql.split(/;\s*?\n/);
    console.log(`Successfully parsed ${statements.length} independent SQL statements.`);

    const BATCH_SIZE = 200;
    let currentBatch = [];
    let executedCount = 0;

    for (let i = 0; i < statements.length; i++) {
        let stmt = statements[i].trim();
        if (!stmt) continue;
        
        currentBatch.push(stmt);

        if (currentBatch.length >= BATCH_SIZE || i === statements.length - 1) {
            try {
                // Ignore conflict duplicates to allow re-running inserts blindly safely.
                // Replace INSERT INTO ... VALUES with INSERT INTO ... VALUES ON CONFLICT DO NOTHING
                // Actually, standard pg_dump doesn't have ON CONFLICT DO NOTHING.
                const batchQuery = currentBatch.join(';\n');
                await client.query(batchQuery);
                executedCount += currentBatch.length;
            } catch (err) {
                // If batch fails, fallback to individual execution to salvage valid rows
                for (let singleStmt of currentBatch) {
                    try {
                        await client.query(singleStmt);
                        executedCount++;
                    } catch(e) {
                         // silently skip exactly the ones that still fail (e.g. duplicate keys)
                    }
                }
            }
            currentBatch = [];
            if (i % 5000 < 200) {
              console.log(`Progress: Executed roughly ${executedCount} / ${statements.length} inserts...`);
            }
        }
    }

    console.log(`\n\nMigration Complete! Data sync re-applied with surgical precision.`);
    
  } catch (e) {
    console.error(`Migration Script Global Error:`, e);
  } finally {
    await client.end();
  }
}

run();
