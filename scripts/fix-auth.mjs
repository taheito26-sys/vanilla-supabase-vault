import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

async function fixUsers() {
  await client.connect();
  
  const filePath = path.join(process.cwd(), "Migrate", "09_auth_users.sql");
  let sql = fs.readFileSync(filePath, "utf8");
  
  // Strip 'confirmed_at,' from the column list
  sql = sql.replace(/, confirmed_at,/g, ',');
  
  // Strip the confirmed_at value from the VALUES clause
  // Basically the values are on lines like:
  // '2026-03-22 06:52:08.866437+00',
  // '2026-03-22 06:52:08.866437+00', <-- this is confirmed_at
  // We can just use a regex for two identical consecutive timestamps or just rely on the structure.
  
  // A safer programmatic way is to do the INSERT manually:
  
  const users = [
    {
      id: 'd9acf3c1-c650-4c0c-8eba-13b992026ea0',
      email: 'testmerchant@example.com',
      email_confirmed_at: '2026-03-22 06:52:08.866437+00',
      raw_app_meta_data: '{"provider": "email", "providers": ["email"]}',
      raw_user_meta_data: '{"email": "testmerchant@example.com", "email_verified": true, "phone_verified": false}'
    },
    {
      id: 'c0c85f54-ad64-4baf-9247-6c81d131d9d9',
      email: 'taheito26@gmail.com',
      email_confirmed_at: '2026-03-22 09:06:18.773408+00',
      raw_app_meta_data: '{"provider": "email", "providers": ["email", "google"]}',
      raw_user_meta_data: '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIUpcHt-I7SCQgog20KuZTWSiRR5dY-pz6f2VJHX3ytKiBmQQ=s96-c", "email": "taheito26@gmail.com", "email_verified": true, "full_name": "Mohamed Taha", "name": "Mohamed Taha"}'
    },
    {
      id: 'efe7910b-3633-43f8-8423-5beefe1565b1',
      email: 'muhamed.taha86@gmail.com',
      email_confirmed_at: '2026-03-22 17:14:51.500218+00',
      raw_app_meta_data: '{"provider": "email", "providers": ["email", "google"]}',
      raw_user_meta_data: '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIppXqHEj9oIvD8LqZ0Vo2a_LwQT_QSa1oEXX87DrJXExmjskSO=s96-c", "email": "muhamed.taha86@gmail.com", "email_verified": true, "full_name": "Mohamed Taha", "name": "Mohamed Taha"}'
    },
    {
      id: '84fb9836-dd51-4cdf-b692-9d3de5c7c1df',
      email: 'ahmednasser241093@gmail.com',
      email_confirmed_at: '2026-03-24 20:18:15.712533+00',
      raw_app_meta_data: '{"provider": "google", "providers": ["google"]}',
      raw_user_meta_data: '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocK2SNhNUt5yc5-EapoB5SEl9zyhEgU1-lWZmI5JmNT3Hfm3BOlY_g=s96-c", "email": "ahmednasser241093@gmail.com", "email_verified": true, "full_name": "Ahmed Nasser", "name": "Ahmed Nasser"}'
    },
    {
      id: 'fc995e98-f667-4024-9d40-a9c75dab2320',
      email: 'zakimlh83@gmail.com',
      email_confirmed_at: '2026-03-24 20:21:30.274914+00',
      raw_app_meta_data: '{"provider": "google", "providers": ["google"]}',
      raw_user_meta_data: '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIYSxkQIFbJK5WlcrDm9ltz50G7lzUUCFv3urS1T994X1uCPt8a=s96-c", "email": "zakimlh83@gmail.com", "email_verified": true, "full_name": "Zack Zack", "name": "Zack Zack"}'
    },
    {
      id: '0e9a503a-502c-4ecf-8c63-449993fbad36',
      email: 'qatar339090@gmail.com',
      email_confirmed_at: '2026-03-25 03:03:48.152323+00',
      raw_app_meta_data: '{"provider": "google", "providers": ["google"]}',
      raw_user_meta_data: '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJbBYeTaeG46iWrk6_II50vMFNp1RcWn2Sj57H_F1MWvJTSRynf=s96-c", "email": "qatar339090@gmail.com", "email_verified": true, "full_name": "ahmed awny", "name": "ahmed awny"}'
    },
    {
      id: 'f979a7ec-f60a-41c3-9eb9-bfa5a07ae823',
      email: 'rogernadado@gmail.com',
      email_confirmed_at: '2026-03-28 17:55:23.594407+00',
      raw_app_meta_data: '{"provider": "google", "providers": ["google"]}',
      raw_user_meta_data: '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJK1quYU_TAsk7f9cI2XH7WBba1IUhB-nf1n_TmuYpCQMYNsg=s96-c", "email": "rogernadado@gmail.com", "email_verified": true, "full_name": "Roger Nadado", "name": "Roger Nadado"}'
    }
  ];

  for (const u of users) {
    try {
      await client.query(`
        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) 
        VALUES ($1, 'authenticated', 'authenticated', $2, '', $3, $4::jsonb, $5::jsonb, now(), now())
        ON CONFLICT (id) DO NOTHING;
      `, [u.id, u.email, u.email_confirmed_at, u.raw_app_meta_data, u.raw_user_meta_data]);
    } catch (e) {
      console.log('Error insert: ', e.message);
    }
  }

  console.log("Successfully explicitly synced PRD auth users data.");
  await client.end();
}

fixUsers();
