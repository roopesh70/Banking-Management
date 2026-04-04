import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be provided as environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccounts() {
  const { data, error } = await supabase.from('account').select('account_number, status, balance');
  
  if (error) {
    console.error('Error fetching accounts:', error);
    return;
  }

  const maskedData = data.map(acc => ({
    account_number: acc.account_number?.slice(-4)?.padStart(acc.account_number?.length || 0, '*'),
    status: acc.status,
    balance: acc.balance
  }));

  console.log('Accounts:', JSON.stringify(maskedData, null, 2));
}

checkAccounts().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
