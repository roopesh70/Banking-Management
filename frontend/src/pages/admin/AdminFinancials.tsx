import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, ArrowLeftRight, Wallet, PiggyBank, BadgeDollarSign } from 'lucide-react';

export default function AdminFinancials() {
  const [data, setData] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    depositCount: 0,
    withdrawalCount: 0,
    transferCount: 0,
    totalBalanceInBank: 0,
    totalLoanDisbursed: 0,
    totalEmiCollected: 0,
    pendingLoanAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [deposits, withdrawals, transfers, accounts, approvedLoans, paidEmi, pendingLoans] = await Promise.all([
        supabase.from('transaction').select('amount').eq('type', 'Deposit').eq('status', 'Completed'),
        supabase.from('transaction').select('amount').eq('type', 'Withdrawal').eq('status', 'Completed'),
        supabase.from('transaction').select('amount').eq('type', 'Transfer').eq('status', 'Completed'),
        supabase.from('account').select('balance'),
        supabase.from('loan').select('principal_amount').eq('status', 'Approved'),
        supabase.from('repayment_schedule').select('emi_amount').eq('pay_status', 'Paid'),
        supabase.from('loan').select('principal_amount').eq('status', 'Pending'),
      ]);

      const sum = (arr: any[] | null) => (arr || []).reduce((s, r) => s + Number(r.amount || r.balance || r.principal_amount || r.emi_amount || 0), 0);

      setData({
        totalDeposits: sum(deposits.data),
        totalWithdrawals: sum(withdrawals.data),
        totalTransfers: sum(transfers.data),
        depositCount: (deposits.data || []).length,
        withdrawalCount: (withdrawals.data || []).length,
        transferCount: (transfers.data || []).length,
        totalBalanceInBank: sum(accounts.data),
        totalLoanDisbursed: sum(approvedLoans.data),
        totalEmiCollected: sum(paidEmi.data),
        pendingLoanAmount: sum(pendingLoans.data),
      });
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  if (loading) {
    return (
      <div>
        <div className="loading-skeleton" style={{ height: '40px', width: '300px', marginBottom: '24px' }} />
        <div className="admin-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="loading-skeleton" style={{ height: '140px' }} />)}
        </div>
      </div>
    );
  }

  const netFlow = data.totalDeposits - data.totalWithdrawals;

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>Financial Summary</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Bank-wide income, outcome, and balance analytics
          </p>
        </div>
      </div>

      {/* Top Summary */}
      <div className="admin-kpi-grid fade-in delay-1">
        <div className="stat-card emerald">
          <div className="stat-icon"><Wallet size={22} /></div>
          <div className="stat-label">Total Bank Deposits</div>
          <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>₹{fmt(data.totalBalanceInBank)}</div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>Sum of all account balances</div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-icon"><TrendingUp size={22} /></div>
          <div className="stat-label">Net Cash Flow</div>
          <div className="stat-value" style={{ color: netFlow >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {netFlow >= 0 ? '+' : ''}₹{fmt(netFlow)}
          </div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>Deposits − Withdrawals</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon"><PiggyBank size={22} /></div>
          <div className="stat-label">Loans Disbursed</div>
          <div className="stat-value">₹{fmt(data.totalLoanDisbursed)}</div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>Approved loans total</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon"><BadgeDollarSign size={22} /></div>
          <div className="stat-label">EMI Collected</div>
          <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>₹{fmt(data.totalEmiCollected)}</div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>From paid installments</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="fade-in delay-2">
        {/* Income */}
        <div className="glass-panel-static">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="var(--success)" /> Income Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(var(--success-rgb), 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--success-rgb), 0.1)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Deposits</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{data.depositCount} transactions</div>
              </div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '1.1rem', alignSelf: 'center' }}>
                +₹{fmt(data.totalDeposits)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(var(--success-rgb), 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--success-rgb), 0.08)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>EMI Collections</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>From repayment schedules</div>
              </div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '1.1rem', alignSelf: 'center' }}>
                +₹{fmt(data.totalEmiCollected)}
              </div>
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Income</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)', fontSize: '1.15rem' }}>
                ₹{fmt(data.totalDeposits + data.totalEmiCollected)}
              </span>
            </div>
          </div>
        </div>

        {/* Outcome */}
        <div className="glass-panel-static">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={20} color="var(--danger)" /> Outcome Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(var(--danger-rgb), 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--danger-rgb), 0.1)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Withdrawals</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{data.withdrawalCount} transactions</div>
              </div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontSize: '1.1rem', alignSelf: 'center' }}>
                -₹{fmt(data.totalWithdrawals)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(var(--danger-rgb), 0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--danger-rgb), 0.08)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Loans Disbursed</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Approved loans principal</div>
              </div>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontSize: '1.1rem', alignSelf: 'center' }}>
                -₹{fmt(data.totalLoanDisbursed)}
              </div>
            </div>

            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Outcome</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontSize: '1.15rem' }}>
                ₹{fmt(data.totalWithdrawals + data.totalLoanDisbursed)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Volume */}
      <div className="glass-panel-static fade-in delay-3">
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeftRight size={20} color="var(--accent-primary)" /> Transfer Volume
        </h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: 'rgba(var(--accent-primary-rgb), 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--accent-primary-rgb), 0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Total Transfer Volume</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>₹{fmt(data.totalTransfers)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Number of Transfers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.transferCount}</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', padding: '16px', background: 'rgba(var(--warning-rgb), 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--warning-rgb), 0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Pending Loan Requests</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>₹{fmt(data.pendingLoanAmount)}</div>
          </div>
        </div>
      </div>
    </>
  );
}
