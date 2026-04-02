import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Use service role if needed
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPause() {
  console.log('--- Testing Standing Instruction Pause Logic ---');

  // 1. Get a customer and two accounts
  const { data: accounts } = await supabase.from('account').select('*').limit(2);
  if (!accounts || accounts.length < 2) {
    console.error('Not enough accounts to test.');
    return;
  }

  const fromAcc = accounts[0];
  const toAcc = accounts[1];
  const customerId = fromAcc.customer_id;

  console.log(`Using Customer: ${customerId}`);
  console.log(`From Account: ${fromAcc.account_number} (Bal: ${fromAcc.balance})`);
  console.log(`To Account: ${toAcc.account_number} (Bal: ${toAcc.balance})`);

  // 2. Create an ACTIVE instruction due TODAY
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const dateStr = pastDate.toISOString().split('T')[0];

  console.log('Creating ACTIVE instruction...');
  const { data: activeInst, error: e1 } = await supabase.from('standing_instruction').insert([{
    customer_id: customerId,
    from_account_id: fromAcc.account_id,
    to_account_id: toAcc.account_id,
    amount: 10.00,
    frequency: 'Monthly',
    next_execution_date: dateStr,
    status: 'Active'
  }]).select().single();

  if (e1) console.error('Error creating active inst:', e1);

  // 3. Create a PAUSED instruction due TODAY
  console.log('Creating PAUSED instruction...');
  const { data: pausedInst, error: e2 } = await supabase.from('standing_instruction').insert([{
    customer_id: customerId,
    from_account_id: fromAcc.account_id,
    to_account_id: toAcc.account_id,
    amount: 20.00,
    frequency: 'Monthly',
    next_execution_date: dateStr,
    status: 'Paused'
  }]).select().single();

  if (e2) console.error('Error creating paused inst:', e2);

  // 4. Run Cron
  console.log('Running CRON simulation...');
  const { data: cronResult, error: e3 } = await supabase.rpc('simulate_cron_engine');
  if (e3) console.error('Error running cron:', e3);
  console.log('Cron Result:', JSON.stringify(cronResult, null, 2));

  // 5. Verify results
  // Active one should have updated date and created a transaction
  // Paused one should still have old date
  const { data: updatedActive } = await supabase.from('standing_instruction').select('*').eq('instruction_id', activeInst.instruction_id).single();
  const { data: updatedPaused } = await supabase.from('standing_instruction').select('*').eq('instruction_id', pausedInst.instruction_id).single();

  console.log(`Active Instruction Next Date: ${updatedActive.next_execution_date} (Was: ${dateStr})`);
  console.log(`Paused Instruction Next Date: ${updatedPaused.next_execution_date} (Was: ${dateStr})`);

  if (updatedActive.next_execution_date !== dateStr && updatedPaused.next_execution_date === dateStr) {
    console.log('SUCCESS: Active was processed, Paused was skipped.');
  } else {
    console.log('FAILURE: Unexpected processing results.');
  }

  // Cleanup
  await supabase.from('standing_instruction').delete().in('instruction_id', [activeInst.instruction_id, pausedInst.instruction_id]);
}

testPause();
