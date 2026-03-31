import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search } from 'lucide-react';

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(300);
      if (filterEvent) query = query.eq('event_type', filterEvent);
      const { data } = await query;
      if (data) setLogs(data);
      setLoading(false);
    }
    load();
  }, [filterEvent]);

  const filtered = logs.filter(l =>
    (l.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.event_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const eventColor = (type: string) => {
    if (type.includes('SUCCESS')) return 'success';
    if (type.includes('FAILED') || type.includes('LOCKED')) return 'danger';
    if (type.includes('LOGOUT')) return 'warning';
    return 'info';
  };

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>Audit Logs</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Complete login/logout event trail with IP tracking (REQ-4B)
          </p>
        </div>
        <span className="badge info">{logs.length} entries</span>
      </div>

      <div className="glass-panel-static fade-in delay-1">
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input type="text" className="search-input" placeholder="Search by username or event..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%' }} />
          </div>
          <select className="form-control" value={filterEvent} onChange={e => setFilterEvent(e.target.value)} style={{ width: 'auto', minWidth: '180px' }}>
            <option value="">All Events</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGIN_FAILED">Login Failed</option>
            <option value="ACCOUNT_LOCKED">Account Locked</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="loading-skeleton" style={{ height: '48px' }} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Username</th>
                  <th>Event Type</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.log_id}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.username || '—'}</td>
                    <td>
                      <span className={`badge ${eventColor(log.event_type)}`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>No audit logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
