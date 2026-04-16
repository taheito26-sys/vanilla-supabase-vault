import pg from 'pg';
const { Client } = pg;
const c = new Client('postgresql://postgres.moebuhqkwvpfcpsxmvuc:Acum3nH0ld1ng%40123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres');
await c.connect();
const result = await c.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
console.log('Tables:', result.rows[0].count);
await c.end();
