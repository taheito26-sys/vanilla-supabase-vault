import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
const dbUrl = process.argv[2];
const client = new Client({ connectionString: dbUrl });

async function fixIdentities() {
  await client.connect();

  const identitiesQuery = `
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at) VALUES (
  '3daf486d-5c26-46d1-8a93-2bcc0b0eb79b',
  'd9acf3c1-c650-4c0c-8eba-13b992026ea0',
  '{"email": "testmerchant@example.com", "email_verified": false, "phone_verified": false, "sub": "d9acf3c1-c650-4c0c-8eba-13b992026ea0"}'::jsonb,
  'email',
  'd9acf3c1-c650-4c0c-8eba-13b992026ea0',
  '2026-03-22 06:52:08.860587+00',
  '2026-03-22 06:52:08.860587+00',
  '2026-03-22 06:52:08.860587+00'
) ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at) VALUES (
  'b4ed8001-ce62-4bbe-93de-5a2f540b1407',
  'c0c85f54-ad64-4baf-9247-6c81d131d9d9',
  '{"email": "taheito26@gmail.com", "email_verified": false, "phone_verified": false, "sub": "c0c85f54-ad64-4baf-9247-6c81d131d9d9"}'::jsonb,
  'email',
  'c0c85f54-ad64-4baf-9247-6c81d131d9d9',
  '2026-03-22 09:06:18.761159+00',
  '2026-03-22 09:06:18.761159+00',
  '2026-03-22 09:06:18.761159+00'
) ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at) VALUES (
  'ec93f999-7d10-44bc-b17b-9bacb6167bdb',
  'c0c85f54-ad64-4baf-9247-6c81d131d9d9',
  '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIUpcHt-I7SCQgog20KuZTWSiRR5dY-pz6f2VJHX3ytKiBmQQ=s96-c", "email": "taheito26@gmail.com", "email_verified": true, "full_name": "Mohamed Taha", "name": "Mohamed Taha"}'::jsonb,
  'google',
  '108717341685489806343',
  '2026-03-24 10:35:30.530646+00',
  '2026-04-16 11:30:44.541987+00',
  '2026-03-24 10:35:30.530646+00'
) ON CONFLICT (provider_id, provider) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at) VALUES (
  'ffc49d4c-b9b6-4c78-8f7e-2423241f856c',
  'efe7910b-3633-43f8-8423-5beefe1565b1',
  '{"avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIppXqHEj9oIvD8LqZ0Vo2a_LwQT_QSa1oEXX87DrJXExmjskSO=s96-c", "email": "muhamed.taha86@gmail.com", "email_verified": true, "full_name": "Mohamed Taha", "name": "Mohamed Taha"}'::jsonb,
  'google',
  '101373099141790976064',
  '2026-03-24 10:43:56.88393+00',
  '2026-04-15 08:59:04.063712+00',
  '2026-03-24 10:43:56.88393+00'
) ON CONFLICT (provider_id, provider) DO NOTHING;
`;

  try {
    await client.query(identitiesQuery);
    console.log("Successfully implicitly synced auth identities constraints.");
  } catch(e) {
    console.log(e.message);
  }

  await client.end();
}

fixIdentities();
