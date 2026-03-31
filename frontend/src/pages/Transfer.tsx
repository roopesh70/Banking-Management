import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function Transfer() {
  const { customerId } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);

  const [step, setStep] = useState<Step>(1);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccountType, setToAccountType] = useState('internal');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: accs } = await supabase.from('account').select('*').eq('customer_id', customerId);
      const { data: bens } = await supabase.from('beneficiary').select('*').eq('customer_id', customerId);
      if (accs) { setAccounts(accs); if (accs.length > 0) setFromAccount(accs[0].account_id); }
      if (bens) setBeneficiaries(bens);
    }
    loadData();
  }, [customerId]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const selectedFrom = accounts.find(a => a.account_id === fromAccount);
  const selectedBen = beneficiaries.find(b => b.beneficiary_id === toAccountId);

  const handleTransfer = async () => {
    setLoading(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const payload: any = {
        amount: parseFloat(amount),
        type: 'Transfer',
        from_account_id: fromAccount,
      };

      if (toAccountType === 'internal') {
        payload.to_account_id = toAccountId;
      } else {
        payload.beneficiary_id = toAccountId;
      }

      const { error } = await supabase.from('transaction').insert([payload]);
      if (error) throw new Error(error.message);

      setStatusMsg({ text: 'Transfer completed successfully! Balances updated via database trigger.', type: 'success' });
      setAmount('');
      setStep(1);
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'danger' });
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Source' },
    { num: 2, label: 'Destination' },
    { num: 3, label: 'Amount' },
    { num: 4, label: 'Confirm' },
  ];

  const canProceed = () => {
    if (step === 1) return !!fromAccount;
    if (step === 2) return !!toAccountId;
    if (step === 3) return !!amount && parseFloat(amount) > 0;
    return true;
  };

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Fund Transfer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Send money securely via internal routing or NEFT/RTGS
          </p>
        </div>
      </div>

      <div className="glass-panel-static fade-in delay-1" style={{ maxWidth: '680px' }}>
        {/* Status */}
        {statusMsg.text && (
          <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {statusMsg.text}
          </div>
        )}

        {/* Wizard Steps */}
        <div className="wizard-steps">
          {steps.map((s) => (
            <div key={s.num} className={`wizard-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}>
              <div className="wizard-dot">
                {step > s.num ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span className="wizard-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Source Account */}
        {step === 1 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '16px' }}>Select Source Account</h3>
            <div className="form-group">
              <label>Transfer From</label>
              <select className="form-control" value={fromAccount} onChange={e => setFromAccount(e.target.value)}>
                {accounts.map(acc => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_type} — {acc.account_number} (₹{fmt(Number(acc.balance))})
                  </option>
                ))}
              </select>
            </div>
            {selectedFrom && (
              <div style={{ padding: '14px', background: 'rgba(var(--accent-primary-rgb), 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--accent-primary-rgb), 0.1)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Available Balance</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{fmt(Number(selectedFrom.balance))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Destination */}
        {step === 2 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '16px' }}>Choose Destination</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                className={toAccountType === 'internal' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, fontSize: '0.88rem' }}
                onClick={() => { setToAccountType('internal'); setToAccountId(''); }}
              >
                Internal Account
              </button>
              <button
                type="button"
                className={toAccountType === 'external' ? 'btn-primary' : 'btn-secondary'}
                style={{ flex: 1, fontSize: '0.88rem' }}
                onClick={() => { setToAccountType('external'); setToAccountId(''); }}
              >
                Beneficiary (NEFT/RTGS)
              </button>
            </div>

            <div className="form-group">
              <label>{toAccountType === 'internal' ? 'Destination Account ID' : 'Select Beneficiary'}</label>
              {toAccountType === 'internal' ? (
                <input type="text" className="form-control" placeholder="Enter target account UUID" value={toAccountId} onChange={e => setToAccountId(e.target.value)} />
              ) : (
                <select className="form-control" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
                  <option value="">— Choose Beneficiary —</option>
                  {beneficiaries.map(ben => (
                    <option key={ben.beneficiary_id} value={ben.beneficiary_id}>
                      {ben.payee_name} — {ben.bank_name} ({ben.account_number})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Amount */}
        {step === 3 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '16px' }}>Enter Amount</h3>
            <div className="form-group">
              <label>Transfer Amount (₹)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                className="form-control"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '20px' }}
              />
            </div>
            <div className="alert alert-warning" style={{ marginTop: '4px' }}>
              <AlertCircle size={16} />
              Transfers exceeding ₹1,00,000 require Admin approval (Business Rule).
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: '16px' }}>Review & Confirm</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'From', value: selectedFrom ? `${selectedFrom.account_type} — ${selectedFrom.account_number}` : '' },
                { label: 'To', value: toAccountType === 'internal' ? toAccountId : (selectedBen ? `${selectedBen.payee_name} — ${selectedBen.bank_name}` : toAccountId) },
                { label: 'Type', value: toAccountType === 'internal' ? 'Internal Transfer' : 'NEFT / RTGS' },
                { label: 'Amount', value: `₹${fmt(parseFloat(amount) || 0)}`, highlight: true },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: row.highlight ? 'var(--accent-primary)' : 'var(--text-primary)', fontFamily: row.highlight ? 'var(--font-mono)' : undefined }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-between" style={{ marginTop: '28px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStep((step - 1) as Step)}
            disabled={step === 1}
            style={{ opacity: step === 1 ? 0.3 : 1 }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed()}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleTransfer}
              disabled={loading}
              style={{ minWidth: '180px' }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(6,11,24,0.2)', borderTopColor: '#060B18' }} />
                  Processing...
                </>
              ) : (
                <>
                  <Send size={16} /> Execute Transfer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
