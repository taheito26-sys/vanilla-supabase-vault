import pg from 'pg';
const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  console.log('Tables in public schema:', res.rows.map(r => r.table_name));
  await client.end();
}
check();
