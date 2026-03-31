import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  async function loadData() {
    setLoading(true);
    let query = supabase.from('account').select('*, customer:customer_id(name, email)').order('account_number');
    if (filterStatus) query = query.eq('status', filterStatus);
    if (user?.role === 'manager' && user.branch_id) {
      query = query.eq('branch_id', user.branch_id);
    }
    const { data } = await query;
    if (data) setAccounts(data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterStatus]);

  const toggleFreeze = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Frozen' ? 'Active' : 'Frozen';
    await supabase.from('account').update({ status: newStatus }).eq('account_id', id);
    loadData();
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const filtered = accounts.filter(a =>
    a.account_number.includes(searchTerm) ||
    (a.customer as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.customer as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>All Bank Accounts</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Manage accounts and freeze/unfreeze suspicious activity (REQ-7C)
          </p>
        </div>
        <span className="badge info">{accounts.length} accounts</span>
      </div>

      <div className="glass-panel-static fade-in delay-1">
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input type="text" className="search-input" placeholder="Search by name, email, or account number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%' }} />
          </div>
          <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Frozen">Frozen</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <div key={i} className="loading-skeleton" style={{ height: '52px' }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account No</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Daily Limit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc.account_id}>
                    <td className="text-mono" style={{ fontSize: '0.88rem', letterSpacing: '1px' }}>
                      {acc.account_number.match(/.{1,4}/g)?.join(' ')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{(acc.customer as any)?.name || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{(acc.customer as any)?.email || ''}</div>
                    </td>
                    <td><span className="badge neutral">{acc.account_type}</span></td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>₹{fmt(Number(acc.balance))}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>₹{fmt(Number(acc.daily_transaction_limit))}</td>
                    <td>
                      <span className={`badge ${acc.status === 'Active' ? 'success' : acc.status === 'Frozen' ? 'danger' : 'neutral'}`}>
                        {acc.status}
                      </span>
                    </td>
                    <td>
                      {acc.status !== 'Closed' && (
                        <button
                          className={acc.status === 'Frozen' ? 'btn-success' : 'btn-danger'}
                          onClick={() => toggleFreeze(acc.account_id, acc.status)}
                          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          {acc.status === 'Frozen' ? <><Unlock size={13} /> Unfreeze</> : <><Lock size={13} /> Freeze</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>No accounts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
