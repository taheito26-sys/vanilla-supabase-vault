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
    console.log("Connected. Reading and combining all chunked files...");

    let completeSqlBuffer = "";

    for (const file of migrationFiles) {
      const filePath = path.join(process.cwd(), "Migrate", file);
      if (fs.existsSync(filePath)) {
        console.log(`Reading ${file}...`);
        const fileStr = fs.readFileSync(filePath, "utf8");
        completeSqlBuffer += fileStr;
      }
    }

    console.log("Files combined. Cleaning up psql meta-commands...");
    
    // Quick parse to strip lines starting with \ (specifically lines that just start with '\' after potential whitespace)
    const cleanedSql = completeSqlBuffer
      .split('\n')
      .filter(line => !line.trim().startsWith('\\'))
      .join('\n');

    console.log(`Prepared single transaction (${(cleanedSql.length / 1024 / 1024).toFixed(2)} MB). Executing... This will take a few minutes.`);
    
    // Execute the massive insert
    await client.query(cleanedSql);
    
    console.log("Massive combined data inserts successfully complete!");
  } catch (e) {
    console.error(`Migration Script Error:`, e);
  } finally {
    await client.end();
  }
}

// Increase Node string limit processing just in case? Node handles 1GB strings mostly fine.
run();
