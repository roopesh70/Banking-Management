import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeftRight, Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from('transaction').select('*').order('timestamp', { ascending: false }).limit(200);
      if (filterType) query = query.eq('type', filterType);
      const { data } = await query;
      if (data) setTransactions(data);
      setLoading(false);
    }
    load();
  }, [filterType]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const filtered = transactions.filter(tx =>
    (tx.transaction_ref || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>All Transactions</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Complete transaction ledger across all accounts
          </p>
        </div>
        <span className="badge info">{transactions.length} shown</span>
      </div>

      <div className="glass-panel-static fade-in delay-1">
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input type="text" className="search-input" placeholder="Search by ref number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%' }} />
          </div>
          <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
            <option value="">All Types</option>
            <option value="Deposit">Deposit</option>
            <option value="Withdrawal">Withdrawal</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="loading-skeleton" style={{ height: '52px' }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Ref Number</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>From Account</th>
                  <th>To Account</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {new Date(tx.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.82rem' }}>{tx.transaction_ref || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {tx.type === 'Deposit' ? <ArrowDownRight size={14} color="var(--success)" /> :
                         tx.type === 'Withdrawal' ? <ArrowUpRight size={14} color="var(--danger)" /> :
                         <ArrowLeftRight size={14} color="var(--accent-primary)" />}
                        {tx.type}
                      </div>
                    </td>
                    <td style={{
                      fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                      color: tx.type === 'Deposit' ? 'var(--success)' : tx.type === 'Withdrawal' ? 'var(--danger)' : 'var(--text-primary)'
                    }}>
                      ₹{fmt(Number(tx.amount))}
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {tx.from_account_id ? tx.from_account_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                      {tx.to_account_id ? tx.to_account_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td>
                      <span className={`badge ${tx.status === 'Completed' ? 'success' : tx.status === 'Failed' ? 'danger' : 'warning'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>No transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
