import pg from 'pg';
const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

async function inspect() {
  await client.connect();
  try {
      const res = await client.query("SELECT * FROM vault.decrypted_secrets");
      console.log('vault:', res.rows);
  } catch(e) { console.log('e:', e.message); }
  await client.end();
}
inspect().catch(e=>console.log(e.message));
