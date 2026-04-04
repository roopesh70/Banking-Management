import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY must be provided as environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Freezes a bank account by its account number.
 * @param {string|number} accountNumber - The unique account number to freeze.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function freezeAccount(accountNumber) {
  // 1. Input Validation
  if (!accountNumber || (typeof accountNumber !== 'string' && typeof accountNumber !== 'number')) {
    return { success: false, error: 'Invalid account number provided.' };
  }

  try {
    // 2. Verification - Ensure the account exists
    const { data: existing, error: findError } = await supabase
      .from('account')
      .select('account_id, status')
      .eq('account_number', accountNumber)
      .single();

    if (findError || !existing) {
      return { success: false, error: findError?.message || 'Account not found.' };
    }

    if (existing.status === 'Frozen') {
      return { success: true, message: 'Account is already frozen.', data: existing };
    }

    // 3. Update
    const { data, error } = await supabase
      .from('account')
      .update({ status: 'Frozen' })
      .eq('account_number', accountNumber)
      .select()
      .single();

    if (error) throw error;

    // 4. Structured return
    return { success: true, data };
  } catch (err) {
    console.error('Failure in freezeAccount:', err.message);
    return { success: false, error: err.message };
  }
}
