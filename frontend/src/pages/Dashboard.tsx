import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, CreditCard, BadgeDollarSign, FileText } from 'lucide-react';

export default function Dashboard() {
  const { customerId } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loanCount, setLoanCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const { data: custData } = await supabase
        .from('customer').select('name').eq('customer_id', customerId).single();
      if (custData) setCustomerName(custData.name);

      const { data: accData } = await supabase
        .from('account').select('*').eq('customer_id', customerId);
      if (accData) setAccounts(accData);

      // Loan count
      const { count } = await supabase
        .from('loan').select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId).in('status', ['Pending', 'Approved']);
      setLoanCount(count || 0);

      // Recent transactions
      if (accData && accData.length > 0) {
        const accountIds = accData.map(a => a.account_id);
        const { data: txData } = await supabase
          .from('transaction').select('*')
          .or(`from_account_id.in.(${accountIds.join(',')}),to_account_id.in.(${accountIds.join(',')})`)
          .order('timestamp', { ascending: false }).limit(10);
        if (txData) setTransactions(txData);
      }
      setLoading(false);
    }
    if (customerId) loadDashboard();
  }, [customerId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="loading-skeleton" style={{ height: '40px', width: '300px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="loading-skeleton" style={{ height: '140px' }} />)}
        </div>
        <div className="loading-skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const activeAccounts = accounts.filter(a => a.status === 'Active').length;
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <>
      {/* Header */}
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Welcome back, {customerName}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Here's an overview of your financial portfolio
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-grid fade-in delay-1">
        <div className="stat-card cyan">
          <div className="stat-icon"><Wallet size={22} /></div>
          <div className="stat-label">Total Net Balance</div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>₹{fmt(totalBalance)}</div>
          <div className="stat-change" style={{ color: 'var(--success)' }}>
            <TrendingUp size={14} /> Across all accounts
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon"><CreditCard size={22} /></div>
          <div className="stat-label">Active Accounts</div>
          <div className="stat-value">{activeAccounts}</div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>
            of {accounts.length} total
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="stat-icon"><BadgeDollarSign size={22} /></div>
          <div className="stat-label">Recent Transactions</div>
          <div className="stat-value">{transactions.length}</div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>
            Last 10 shown
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon"><FileText size={22} /></div>
          <div className="stat-label">Active Loans</div>
          <div className="stat-value">{loanCount}</div>
          <div className="stat-change" style={{ color: 'var(--text-tertiary)' }}>
            Pending + Approved
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }} className="fade-in delay-2">
        {accounts.map((acc, i) => (
          <div key={acc.account_id} className="glass-panel" style={{
            borderLeft: `3px solid ${acc.account_type === 'Savings' ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`,
            animationDelay: `${0.1 + i * 0.05}s`
          }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>
                {acc.account_type} Account
              </span>
              <span className={`badge ${acc.status === 'Active' ? 'success' : acc.status === 'Frozen' ? 'danger' : 'neutral'}`}>
                {acc.status}
              </span>
            </div>
            <h3 className="text-mono" style={{ fontSize: '1.1rem', letterSpacing: '2.5px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              {acc.account_number.match(/.{1,4}/g)?.join(' ')}
            </h3>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              ₹{fmt(Number(acc.balance))}
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Daily Limit: ₹{fmt(Number(acc.daily_transaction_limit))}
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="glass-panel-static fade-in delay-3">
        <h3 style={{ marginBottom: '4px' }}>Recent Transactions</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '8px' }}>Last 10 transactions across all accounts</p>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <BadgeDollarSign size={48} />
            <h4>No Transactions Yet</h4>
            <p>Your recent transactions will appear here once they're made.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Ref Number</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const isDebit = tx.from_account_id && accounts.some(a => a.account_id === tx.from_account_id);
                return (
                  <tr key={tx.transaction_id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      {new Date(tx.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.82rem' }}>{tx.transaction_ref}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isDebit
                          ? <ArrowUpRight size={15} color="var(--danger)" />
                          : <ArrowDownRight size={15} color="var(--success)" />}
                        {tx.type}
                      </div>
                    </td>
                    <td style={{ color: isDebit ? 'var(--danger)' : 'var(--success)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                      {isDebit ? '-' : '+'} ₹{fmt(Number(tx.amount))}
                    </td>
                    <td>
                      <span className={`badge ${tx.status === 'Completed' ? 'success' : tx.status === 'Failed' ? 'danger' : 'warning'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
