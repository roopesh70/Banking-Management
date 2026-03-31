import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminLoans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    let query = supabase.from('loan').select('*, customer:customer_id(name, email)').order('applied_on', { ascending: false });
    if (filterStatus) query = query.eq('status', filterStatus);
    const { data } = await query;
    if (data) setLoans(data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterStatus]);

  const updateLoanStatus = async (id: string, status: string) => {
    await supabase.from('loan').update({ status }).eq('loan_id', id);
    loadData();
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const statusColor = (s: string) => s === 'Approved' ? 'success' : s === 'Pending' ? 'warning' : s === 'Rejected' ? 'danger' : 'neutral';

  const filtered = loans.filter(l =>
    (l.customer as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.loan_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>Loan Management</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Review and approve/reject loan applications. EMI is auto-generated on approval (REQ-17).
          </p>
        </div>
        <span className="badge info">{loans.length} loans</span>
      </div>

      <div className="glass-panel-static fade-in delay-1">
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input type="text" className="search-input" placeholder="Search by customer or loan type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%' }} />
          </div>
          <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
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
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Principal</th>
                  <th>Rate</th>
                  <th>Tenure</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(loan => (
                  <tr key={loan.loan_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{(loan.customer as any)?.name || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{(loan.customer as any)?.email || ''}</div>
                    </td>
                    <td><span className="badge neutral">{loan.loan_type}</span></td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>₹{fmt(Number(loan.principal_amount))}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>{loan.interest_rate}%</td>
                    <td>{loan.tenure_months} mo</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(loan.applied_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge ${statusColor(loan.status)}`}>{loan.status}</span>
                    </td>
                    <td>
                      {loan.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-success" onClick={() => updateLoanStatus(loan.loan_id, 'Approved')} style={{ fontSize: '0.78rem', padding: '6px 10px' }}>
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button className="btn-danger" onClick={() => updateLoanStatus(loan.loan_id, 'Rejected')} style={{ fontSize: '0.78rem', padding: '6px 10px' }}>
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>No loans found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
