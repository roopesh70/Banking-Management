import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CreditCard, ArrowLeftRight, FileText, BadgeDollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    customers: 0, accounts: 0, transactions: 0,
    pendingLoans: 0, totalDeposits: 0, totalWithdrawals: 0, frozenAccounts: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      let allowedAccountIds: string[] = [];
      if (user?.role === 'manager' && user.branch_id) {
        const accRes = await supabase.from('account').select('account_id').eq('branch_id', user.branch_id);
        allowedAccountIds = (accRes.data || []).map(a => a.account_id);
      }

      let accQuery = supabase.from('account').select('*', { count: 'exact', head: true });
      if (user?.role === 'manager' && user.branch_id) accQuery = accQuery.eq('branch_id', user.branch_id);

      let frozenQuery = supabase.from('account').select('*', { count: 'exact', head: true }).eq('status', 'Frozen');
      if (user?.role === 'manager' && user.branch_id) frozenQuery = frozenQuery.eq('branch_id', user.branch_id);

      let txQuery = supabase.from('transaction').select('*', { count: 'exact', head: true });
      if (user?.role === 'manager' && user.branch_id) {
         if (allowedAccountIds.length > 0) {
           txQuery = txQuery.or(`from_account_id.in.(${allowedAccountIds.join(',')}),to_account_id.in.(${allowedAccountIds.join(',')})`);
         } else {
           txQuery = txQuery.eq('transaction_id', '00000000-0000-0000-0000-000000000000');
         }
      }

      const [custRes, accRes, txRes, loanRes, frozenRes] = await Promise.all([
        supabase.from('customer').select('*', { count: 'exact', head: true }),
        accQuery,
        txQuery,
        supabase.from('loan').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        frozenQuery,
      ]);

      let depQuery = supabase.from('transaction').select('amount').eq('type', 'Deposit').eq('status', 'Completed');
      let withQuery = supabase.from('transaction').select('amount').eq('type', 'Withdrawal').eq('status', 'Completed');

      if (user?.role === 'manager' && user.branch_id) {
        if (allowedAccountIds.length > 0) {
          depQuery = depQuery.in('to_account_id', allowedAccountIds);
          withQuery = withQuery.in('from_account_id', allowedAccountIds);
        } else {
          depQuery = depQuery.eq('transaction_id', 'none');
          withQuery = withQuery.eq('transaction_id', 'none');
        }
      }

      const [{ data: deposits }, { data: withdrawals }] = await Promise.all([ depQuery, withQuery ]);

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
