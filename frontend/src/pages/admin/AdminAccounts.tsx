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
    if ((user?.role === 'manager' || user?.role === 'staff') && user.branch_id) {
      query = query.eq('branch_id', user.branch_id);
    }
    const { data } = await query;
    if (data) setAccounts(data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterStatus, user]);

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
    <div className="max-w-7xl mx-auto px-2 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-wide uppercase text-primary">All Bank Accounts</h1>
          <p className="text-sm text-secondary mt-1">Manage accounts and freeze/unfreeze suspicious activity (REQ-7C)</p>
        </div>
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary tracking-wide shadow-sm">
          {accounts.length} accounts
        </span>
      </div>

      <div className="bg-card rounded-[40px] p-6 md:p-10 shadow-sm min-h-[500px]">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-lg">
            <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-secondary" />
            <input type="text" className="w-full bg-app text-primary rounded-full pl-12 pr-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all shadow-sm" placeholder="Search by name, email, or account number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          
          <select className="bg-app text-primary rounded-full px-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none shadow-sm border border-transparent min-w-[160px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Frozen">Frozen</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-app rounded-2xl" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-app">
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Account No</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Customer</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Type</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2 text-right">Balance</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2 text-right">Daily Limit</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4 text-center">Status</th>
                  <th className="pb-4 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {filtered.map(acc => (
                  <tr key={acc.account_id} className="hover:bg-app/30 transition-colors">
                    <td className="py-4 px-2 text-[14px] font-mono tracking-widest text-primary whitespace-nowrap">
                      {acc.account_number.match(/.{1,4}/g)?.join(' ')}
                    </td>
                    <td className="py-4 px-2">
                      <div className="font-medium text-[14px] text-primary whitespace-nowrap">{(acc.customer as any)?.name || '—'}</div>
                      <div className="text-[12px] text-secondary">{(acc.customer as any)?.email || ''}</div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-app border border-black/5 text-primary tracking-wide">
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right font-semibold font-mono tracking-wide text-primary">₹{fmt(Number(acc.balance))}</td>
                    <td className="py-4 px-2 text-right font-mono tracking-wide text-secondary text-[13px]">₹{fmt(Number(acc.daily_transaction_limit))}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium tracking-wide min-w-[70px] ${
                        acc.status === 'Active' ? 'bg-accent-teal/10 text-accent-teal' : 
                        acc.status === 'Frozen' ? 'bg-accent-rose/10 text-accent-rose' : 
                        'bg-app border border-black/5 text-secondary'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right whitespace-nowrap">
                      {acc.status !== 'Closed' && user?.role !== 'staff' && (
                        <button
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${acc.status === 'Frozen' ? 'text-accent-teal hover:bg-accent-teal/10' : 'text-accent-rose hover:bg-accent-rose/10'}`}
                          onClick={() => toggleFreeze(acc.account_id, acc.status)}
                        >
                          {acc.status === 'Frozen' ? <><Unlock size={14} /> Unfreeze</> : <><Lock size={14} /> Freeze</>}
                        </button>
                      )}
                      {user?.role === 'staff' && (
                        <span className="text-[11px] text-secondary italic">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary py-16">
                      {searchTerm ? 'No accounts match search criteria.' : 'No accounts found.'}
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
