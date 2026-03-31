import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CreditCard, ArrowLeftRight, FileText, BadgeDollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    customers: 0, accounts: 0, transactions: 0,
    pendingLoans: 0, totalDeposits: 0, totalWithdrawals: 0, frozenAccounts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [custRes, accRes, txRes, loanRes, frozenRes] = await Promise.all([
        supabase.from('customer').select('*', { count: 'exact', head: true }),
        supabase.from('account').select('*', { count: 'exact', head: true }),
        supabase.from('transaction').select('*', { count: 'exact', head: true }),
        supabase.from('loan').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('account').select('*', { count: 'exact', head: true }).eq('status', 'Frozen'),
      ]);

      // Sum deposits and withdrawals
      const { data: deposits } = await supabase.from('transaction').select('amount').eq('type', 'Deposit').eq('status', 'Completed');
      const { data: withdrawals } = await supabase.from('transaction').select('amount').eq('type', 'Withdrawal').eq('status', 'Completed');

      const totalDep = (deposits || []).reduce((s, t) => s + Number(t.amount), 0);
      const totalWith = (withdrawals || []).reduce((s, t) => s + Number(t.amount), 0);

      setStats({
        customers: custRes.count || 0,
        accounts: accRes.count || 0,
        transactions: txRes.count || 0,
        pendingLoans: loanRes.count || 0,
        totalDeposits: totalDep,
        totalWithdrawals: totalWith,
        frozenAccounts: frozenRes.count || 0,
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

  const cards = [
    { label: 'Total Customers', value: stats.customers, icon: Users, variant: 'cyan' as const },
    { label: 'Total Accounts', value: stats.accounts, icon: CreditCard, variant: 'purple' as const },
    { label: 'Total Transactions', value: stats.transactions, icon: ArrowLeftRight, variant: 'emerald' as const },
    { label: 'Pending Loans', value: stats.pendingLoans, icon: FileText, variant: 'amber' as const },
    { label: 'Total Deposits', value: `₹${fmt(stats.totalDeposits)}`, icon: TrendingUp, variant: 'emerald' as const },
    { label: 'Total Withdrawals', value: `₹${fmt(stats.totalWithdrawals)}`, icon: BadgeDollarSign, variant: 'amber' as const },
    { label: 'Frozen Accounts', value: stats.frozenAccounts, icon: AlertTriangle, variant: 'cyan' as const },
  ];

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            System-wide overview of all banking operations
          </p>
        </div>
      </div>

      <div className="admin-kpi-grid fade-in delay-1">
        {cards.map((card, i) => (
          <div key={card.label} className={`stat-card ${card.variant}`} style={{ animationDelay: `${0.05 * i}s` }}>
            <div className="stat-icon"><card.icon size={22} /></div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel-static fade-in delay-3" style={{ padding: '20px 24px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Use the sidebar to manage <strong>customers</strong>, <strong>employees</strong>, <strong>accounts</strong>, <strong>transactions</strong>, <strong>loans</strong>, <strong>audit logs</strong>, and view <strong>financial summaries</strong>.
        </p>
      </div>
    </>
  );
}
