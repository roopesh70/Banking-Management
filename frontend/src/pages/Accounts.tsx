import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, PlusCircle, CheckCircle2, Sparkles, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Accounts() {
  const { customerId } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const accountOptions = [
    {
      type: 'Savings',
      icon: Landmark,
      color: 'var(--accent-primary)',
      colorRgb: 'var(--accent-primary-rgb)',
      description: 'Ideal for personal savings with competitive interest rates.',
      features: ['No minimum balance', '₹5,000 starting credit', '4% annual interest', 'Free debit card'],
    },
    {
      type: 'Current',
      icon: Sparkles,
      color: 'var(--accent-secondary)',
      colorRgb: 'var(--accent-secondary-rgb)',
      description: 'Perfect for business transactions with higher limits.',
      features: ['Higher daily limits', '₹5,000 starting credit', 'Overdraft facility', 'Checkbook included'],
    }
  ];

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType) return;
    setLoading(true);
    setMsg({ text: '', type: '' });

    const generatedAccNo = 'AC' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

    try {
      const { error } = await supabase.from('account').insert([{
        customer_id: customerId,
        account_type: accountType,
        account_number: generatedAccNo,
        balance: 5000.00,
        status: 'Active',
      }]);

      if (error) throw error;

      setMsg({ text: `✓ ${accountType} Account created: #${generatedAccNo.match(/.{1,4}/g)?.join(' ')}. ₹5,000 credited!`, type: 'success' });
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      setMsg({ text: err.message, type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Open New Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Instantly open a Savings or Current account online with digital KYC
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '700px' }} className="fade-in delay-1">
        {msg.text && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <CreditCard size={18} />}
            {msg.text}
          </div>
        )}

        {/* Account Type Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          {accountOptions.map(opt => {
            const isSelected = accountType === opt.type;
            return (
              <div
                key={opt.type}
                onClick={() => setAccountType(opt.type)}
                style={{
                  padding: '24px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  background: isSelected ? `rgba(${opt.colorRgb.replace('var(', '').replace(')', '')}, 0.06)` : 'var(--bg-elevated)',
                  border: isSelected ? `2px solid ${opt.color}` : '2px solid var(--border-subtle)',
                  transition: 'all 0.25s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: `rgba(${opt.colorRgb.replace('var(', '').replace(')', '')}, 0.1)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '14px', color: opt.color
                }}>
                  <opt.icon size={24} />
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>{opt.type} Account</h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', marginBottom: '14px', lineHeight: '1.5' }}>
                  {opt.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {opt.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={13} color={opt.color} /> {f}
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div style={{ marginTop: '14px', textAlign: 'center' }}>
                    <span className="badge success" style={{ fontSize: '0.72rem' }}>Selected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Note + Button */}
        <div className="glass-panel-static">
          <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Note:</strong> By clicking Open Account, you agree to our banking terms.
            A complimentary starting balance of ₹5,000 will be credited immediately to your new account.
          </div>

          <button
            onClick={handleOpenAccount as any}
            className="btn-primary"
            style={{ width: '100%', padding: '14px' }}
            disabled={loading || !accountType}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(6,11,24,0.2)', borderTopColor: '#060B18' }} />
                Processing...
              </>
            ) : (
              <>
                <PlusCircle size={18} />
                {accountType ? `Open ${accountType} Account` : 'Select an Account Type'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
