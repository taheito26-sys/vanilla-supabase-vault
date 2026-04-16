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

    let completeSqlBuffer = "";

    // 1. Load and concatenate files
    for (const file of migrationFiles) {
      const filePath = path.join(process.cwd(), "Migrate", file);
      if (fs.existsSync(filePath)) {
        console.log(`Loading ${file} into memory...`);
        const fileStr = fs.readFileSync(filePath, "utf8");
        completeSqlBuffer += fileStr;
      }
    }

    console.log("Files loaded. Parsing and batching statements...");

    // 2. Remove psql meta-commands and empty lines
    const rawLines = completeSqlBuffer.split('\n');
    let cleanedSql = '';
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line.startsWith('\\') && line.length > 0 && !line.startsWith('--')) {
            cleanedSql += rawLines[i] + '\n';
        }
    }

    // 3. Split the entire 250MB string into individual SQL statements
    // pg_dump usually separates them with ;\n
    const statements = cleanedSql.split(/;\s*?\n/);
    console.log(`Successfully parsed ${statements.length} independent SQL statements.`);

    // 4. Batch execution config
    const BATCH_SIZE = 200; // Sending 200 inserts per batch avoids transaction pooler timeout
    let currentBatch = [];
    let executedCount = 0;
    let errorCount = 0;

    console.log("Initiating batched execution safely...");

    for (let i = 0; i < statements.length; i++) {
      let stmt = statements[i].trim();
      if (!stmt) continue;
      
      currentBatch.push(stmt);

      // Once the batch is full, or if it's the very last statement, execute it
      if (currentBatch.length >= BATCH_SIZE || i === statements.length - 1) {
        const batchQuery = currentBatch.join(';\n');
        try {
            await client.query(batchQuery);
            executedCount += currentBatch.length;
            process.stdout.write(`\rProgress: Executed ${executedCount} / ${statements.length} inserts...`);
        } catch (err) {
            // Because they are distinct rows, if one batch fails (e.g. duplicate key), log and continue
            errorCount++;
            fs.appendFileSync('migration-errors.log', `\n--- ERROR IN BATCH (starts at index ${i - currentBatch.length}) ---\n${err.message}\n`);
        }
        // reset batch
        currentBatch = [];
      }
    }

    console.log(`\n\nMigration Complete!`);
    console.log(`✅ Total successful statements: ${executedCount}`);
    if (errorCount > 0) {
      console.log(`⚠️  Encountered failed batches: ${errorCount}. Check 'migration-errors.log' for details.`);
    }

  } catch (e) {
    console.error(`\nMigration Script Global Error:`, e);
  } finally {
    await client.end();
  }
}

run();
