import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLoans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCronRunning, setIsCronRunning] = useState(false);
  const [cronMsg, setCronMsg] = useState({ text: '', type: '' });
  const { user } = useAuth();

  const runCron = async () => {
    if (isCronRunning) return;
    setIsCronRunning(true);
    try {
      setCronMsg({ text: 'Running automated sweeps...', type: 'info' });
      const { data, error } = await supabase.rpc('simulate_cron_engine');
      if (error) throw error;
      setCronMsg({ 
        text: `CRON Success! Flagged ${data.overdue_marked} overdue EMIs, processed ${data.standing_instructions_processed || 0} standing instructions.`, 
        type: 'success' 
      });
      loadData();
    } catch (err: any) {
      setCronMsg({ text: `CRON Failed: ${err.message}`, type: 'danger' });
    } finally {
      setIsCronRunning(false);
      setTimeout(() => setCronMsg({ text: '', type: '' }), 6000);
    }
  };

  async function loadData() {
    setLoading(true);
    let query = supabase.from('loan').select('*, customer:customer_id(name, email), repayment_schedule(pay_status)').order('applied_on', { ascending: false });
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

  const filtered = loans.filter(l =>
    (l.customer as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.loan_type.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const aOverdue = a.repayment_schedule?.some((s: any) => s.pay_status === 'Overdue') ? 1 : 0;
    const bOverdue = b.repayment_schedule?.some((s: any) => s.pay_status === 'Overdue') ? 1 : 0;
    return bOverdue - aOverdue;
  });

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-wide uppercase text-primary">Loan Management</h1>
          <p className="text-sm text-secondary mt-1">Review and approve/reject loan applications.</p>
        </div>
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary tracking-wide shadow-sm">
          {loans.length} loans
        </span>
      </div>

      <div className="bg-card rounded-[40px] p-6 md:p-10 shadow-sm min-h-[500px]">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-lg">
            <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-secondary" />
            <input type="text" className="w-full bg-app text-primary rounded-full pl-12 pr-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all shadow-sm" placeholder="Search by customer or loan type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          
          <select className="bg-app text-primary rounded-full px-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none shadow-sm border border-transparent min-w-[160px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Closed">Closed</option>
          </select>

          {user?.role !== 'staff' && (
            <button onClick={runCron} disabled={isCronRunning} className="bg-primary text-white rounded-full px-6 py-3.5 text-sm font-medium hover:bg-[#362e34] transition-colors shadow-sm whitespace-nowrap active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
              {isCronRunning ? 'Engine Running...' : 'Force CRON Engine'}
            </button>
          )}
        </div>

        {cronMsg.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in ${cronMsg.type === 'success' ? 'bg-accent-teal/10 text-accent-teal' : cronMsg.type === 'info' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-rose/10 text-accent-rose'}`}>
               {cronMsg.type === 'success' ? <CheckCircle2 size={18} /> : 
                cronMsg.type === 'info' ? <AlertCircle size={18} className="text-accent-gold" /> : 
                <XCircle size={18} className="text-accent-rose" />} 
               {cronMsg.text}
            </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-app rounded-2xl" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-app">
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Customer</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Type</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2 text-right">Principal</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4 text-right">Rate</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4 text-center">Tenure</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4">Applied</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-4 text-center">Status</th>
                  <th className="pb-4 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {filtered.map(loan => (
                  <tr key={loan.loan_id} className="hover:bg-app/30 transition-colors">
                    <td className="py-4 px-2">
                      <div className="font-medium text-[14px] text-primary whitespace-nowrap">{(loan.customer as any)?.name || '—'}</div>
                      <div className="text-[12px] text-secondary">{(loan.customer as any)?.email || ''}</div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-app border border-black/5 text-primary tracking-wide">
                          {loan.loan_type}
                        </span>
                        {loan.repayment_schedule?.some((s: any) => s.pay_status === 'Overdue') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-accent-rose/10 text-accent-rose tracking-wide uppercase mt-1">
                            <AlertCircle size={10} /> EMI Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right font-semibold font-mono tracking-wide text-primary">₹{fmt(Number(loan.principal_amount))}</td>
                    <td className="py-4 px-4 text-right font-mono tracking-wide text-secondary text-[13px]">{loan.interest_rate}%</td>
                    <td className="py-4 px-4 text-center font-mono tracking-wide text-secondary text-[13px]">{loan.tenure_months} mo</td>
                    <td className="py-4 px-4 text-[13px] text-secondary whitespace-nowrap">
                       {formatDate(loan.applied_on)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium tracking-wide min-w-[70px] ${
                        loan.status === 'Approved' ? 'bg-accent-teal/10 text-accent-teal' : 
                        loan.status === 'Rejected' ? 'bg-accent-rose/10 text-accent-rose' :
                        loan.status === 'Pending' ? 'bg-accent-gold/10 text-accent-gold' :
                        'bg-app border border-black/5 text-secondary'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right whitespace-nowrap">
                      {loan.status === 'Pending' && user?.role !== 'staff' && (
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors text-accent-teal hover:bg-accent-teal/10"
                            onClick={() => updateLoanStatus(loan.loan_id, 'Approved')}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors text-accent-rose hover:bg-accent-rose/10"
                            onClick={() => updateLoanStatus(loan.loan_id, 'Rejected')}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                      {loan.status === 'Pending' && user?.role === 'staff' && (
                        <span className="text-[11px] text-secondary italic">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary py-16">
                      {searchTerm ? 'No loans match search criteria.' : 'No loans found.'}
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
