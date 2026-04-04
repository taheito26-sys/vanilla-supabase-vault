const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase credentials. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🌱 Starting Seed Process with Chats and Valid Data...');
  
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) throw userErr;
  
  const adminUser = users.users.find(u => u.email === 'taheito26@gmail.com') || users.users[0];
  if (!adminUser) throw new Error('No admin user found to link data to.');

  const { data: myProfile } = await supabase.from('merchant_profiles').select('*').eq('user_id', adminUser.id).single();
  let myMerchantId = myProfile?.merchant_id;
  
  if (!myMerchantId) {
     const { data: newProfile, error: pErr } = await supabase.from('merchant_profiles').insert([{
         user_id: adminUser.id,
         display_name: 'Admin Group LLC',
         rating: 5.0
     }]).select().single();
     if (pErr) throw pErr;
     myMerchantId = newProfile.merchant_id;
  }
  
  const fakeUserId = crypto.randomUUID();
  const fakeMerchant = {
      merchant_id: `merch_${Date.now()}`,
      display_name: 'Apex Crypto Partners',
      user_id: fakeUserId,
      is_verified: true,
      rating: 4.8
  };
  
  await supabase.from('merchant_profiles').insert([fakeMerchant]);
  const partnerId = fakeMerchant.merchant_id;
  
  const { data: relationship, error: rErr } = await supabase.from('merchant_relationships')
      .insert([{
          merchant_a_id: myMerchantId,
          merchant_b_id: partnerId,
          status: 'active'
      }]).select().single();

  if (rErr) throw rErr;
  const relId = relationship.id;

  await supabase.from('merchant_deals').insert([
      { relationship_id: relId, created_by: adminUser.id, amount: 50000, deal_type: 'usdt_buy', status: 'completed', title: 'Wholesale Buy', notes: 'Done' },
      { relationship_id: relId, created_by: adminUser.id, amount: 12000, deal_type: 'usdt_sell', status: 'completed', title: 'Liquid Injection', notes: 'Done' },
      { relationship_id: relId, created_by: fakeUserId, amount: 8500, deal_type: 'capital_loan', status: 'pending', title: 'Working Capital Req', notes: 'Pending' }
  ]);

  await supabase.from('profit_share_agreements').insert([
      { relationship_id: relId, created_by: adminUser.id, agreement_type: 'standard', partner_ratio: 40, merchant_ratio: 60, status: 'approved', effective_from: new Date().toISOString(), invested_capital: 100000, settlement_way: 'reinvest', settlement_cadence: 'monthly' }
  ]);

  // Seed chat rooms & messages
  const { data: room } = await supabase.from('chat_rooms').insert([{ type: 'relationship', entity_id: relId }]).select().single();
  if (room) {
      await supabase.from('chat_room_participants').insert([
          { room_id: room.id, user_id: adminUser.id },
          { room_id: room.id, user_id: fakeUserId }
      ]);
      await supabase.from('chat_messages').insert([
          { room_id: room.id, sender_id: fakeUserId, content: 'Hello! I deployed the capital request.', message_type: 'deal_alert' },
          { room_id: room.id, sender_id: adminUser.id, content: 'Understood, approving now.', message_type: 'text' }
      ]);
  }

  console.log('✨ Seed Successfully Injected!');
}

seed().catch(err => {
  console.error("SEED FAILED: ", err.message);
  process.exit(1);
});
