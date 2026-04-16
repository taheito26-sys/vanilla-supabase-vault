import pg from 'pg';
const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

async function inspect() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%merchant%'");
  console.log('Tables:', res.rows.map(r=>r.table_name));
  
  for(let row of res.rows) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM public.${row.table_name}`);
        console.log(row.table_name, countRes.rows[0].count);
      } catch(e){}
  }
  await client.end();
}
inspect().catch(e=>console.log(e.message));
