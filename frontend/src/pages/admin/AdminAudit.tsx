import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export default function AdminAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(500);
      if (filterEvent) query = query.eq('event_type', filterEvent);
      if (filterTable) query = query.eq('table_name', filterTable);
      if (dateFrom) query = query.gte('timestamp', new Date(dateFrom).toISOString());
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte('timestamp', to.toISOString());
      }
      const { data, error } = await query;
      if (error) {
        console.error('Failed to fetch audit logs:', error.message);
        // Optionally set an error state to display to user
      }
      setLogs(data ?? []);
      setLoading(false);
    }
    load();
  }, [filterEvent, filterTable, dateFrom, dateTo]);

  const filtered = logs.filter(l =>
    (l.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.event_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const eventBgClass = (type: string) => {
    if (!type) return 'bg-app text-secondary border border-black/5';
    if (type.includes('SUCCESS') || type.includes('APPROVED')) return 'bg-accent-teal/10 text-accent-teal';
    if (type.includes('FAILED') || type.includes('LOCKED') || type.includes('REJECTED')) return 'bg-accent-rose/10 text-accent-rose';
    if (type.includes('LOGOUT') || type.includes('RESET')) return 'bg-accent-gold/10 text-accent-gold';
    if (type.includes('account_') || type.includes('loan_') || type.includes('transaction_')) return 'bg-primary/10 text-primary';
    return 'bg-app text-secondary border border-black/5';
  };

  const clearFilters = () => {
    setFilterEvent('');
    setFilterTable('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterEvent || filterTable || dateFrom || dateTo || searchTerm;

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-wide uppercase text-primary">Audit Logs</h1>
          <p className="text-sm text-secondary mt-1">Complete event trail — auth, account, loan, and transaction changes (REQ-4B, NFR §11)</p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-accent-rose hover:underline font-medium">
              Clear filters
            </button>
          )}
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-secondary/10 text-secondary tracking-wide shadow-sm whitespace-nowrap">
            {filtered.length} entries
          </span>
        </div>
      </div>

      <div className="bg-card rounded-[40px] p-6 md:p-10 shadow-sm min-h-[500px]">
        {/* Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-secondary" />
            <input 
              type="text" 
              className="w-full bg-app text-primary rounded-full pl-12 pr-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 shadow-sm transition-all" 
              placeholder="Search user, event, or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Event Filter */}
          <div className="relative">
            <Filter size={14} className="absolute top-1/2 left-5 -translate-y-1/2 text-secondary pointer-events-none" />
            <select aria-label="Filter by event type" className="w-full bg-app text-primary rounded-full pl-10 pr-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none shadow-sm cursor-pointer" value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
              <option value="">All Events</option>
              <optgroup label="Auth Events">
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="LOGOUT">Logout</option>
                <option value="ACCOUNT_LOCKED">Account Locked</option>
                <option value="PASSWORD_RESET">Password Reset</option>
              </optgroup>
              <optgroup label="Data Events">
                <option value="account_INSERT">Account Created</option>
                <option value="account_UPDATE">Account Updated</option>
                <option value="loan_INSERT">Loan Created</option>
                <option value="loan_UPDATE">Loan Updated</option>
                <option value="transaction_INSERT">Transaction Created</option>
                <option value="transaction_UPDATE">Transaction Updated</option>
              </optgroup>
            </select>
          </div>

          {/* Table Filter */}
          <div className="relative">
            <select aria-label="Filter by table" className="w-full bg-app text-primary rounded-full px-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none shadow-sm cursor-pointer" value={filterTable} onChange={e => setFilterTable(e.target.value)}>
              <option value="">All Tables</option>
              <option value="account">Accounts</option>
              <option value="loan">Loans</option>
              <option value="transaction">Transactions</option>
            </select>
          </div>

          {/* Date Range Row */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="flex items-center gap-3 bg-app/50 p-2 px-4 rounded-full border border-black/5">
              <label htmlFor="audit-date-from" className="text-[11px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap opacity-60">From</label>
              <input id="audit-date-from" type="date" className="flex-1 bg-transparent text-primary text-sm focus:outline-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 bg-app/50 p-2 px-4 rounded-full border border-black/5">
              <label htmlFor="audit-date-to" className="text-[11px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap opacity-60">To</label>
              <input id="audit-date-to" type="date" className="flex-1 bg-transparent text-primary text-sm focus:outline-none" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-app rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-app">
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Timestamp</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4">Username</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4">Event</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4">Description</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {filtered.map(log => (
                  <tr key={log.log_id} className="hover:bg-app/30 transition-colors">
                    <td className="py-3 px-2 text-[13px] text-secondary whitespace-nowrap font-mono">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[14px] text-primary whitespace-nowrap">
                      {log.username || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${eventBgClass(log.event_type)}`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-secondary max-w-[280px] truncate">
                      {log.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tracking-widest text-[#81727E] text-[12px] whitespace-nowrap">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary py-16">
                      {hasActiveFilters ? 'No audit logs match the current filters.' : 'No audit logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
