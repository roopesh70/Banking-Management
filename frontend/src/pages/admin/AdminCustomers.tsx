import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, UserCheck, UserX } from 'lucide-react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from('customer').select('*').order('created_at', { ascending: false });
    if (data) setCustomers(data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('customer').update({ is_active: !currentStatus }).eq('customer_id', id);
    loadData();
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_number.includes(searchTerm)
  );

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>Customer Management</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            View and manage all registered customers (REQ-4C)
          </p>
        </div>
        <span className="badge info">{customers.length} customers</span>
      </div>

      <div className="glass-panel-static fade-in delay-1">
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>DOB</th>
                  <th>Gov ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.customer_id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                    <td className="text-mono" style={{ fontSize: '0.85rem' }}>{c.contact_number}</td>
                    <td>{c.gender || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.date_of_birth}</td>
                    <td className="text-mono" style={{ fontSize: '0.82rem' }}>{c.government_id}</td>
                    <td>
                      <span className={`badge ${c.is_active ? 'success' : 'danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={c.is_active ? 'btn-danger' : 'btn-success'}
                        onClick={() => toggleActive(c.customer_id, c.is_active)}
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      >
                        {c.is_active ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>
                      {searchTerm ? 'No customers match your search.' : 'No customers found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
