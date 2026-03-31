import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Calendar, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

export default function Loans() {
  const { customerId } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('');
  const [type, setType] = useState('Personal');
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const rateMap: Record<string, number> = { Personal: 12.5, Home: 8.5, Auto: 9.5, Education: 7.5 };

  async function loadData() {
    const { data: lnData } = await supabase.from('loan').select('*').eq('customer_id', customerId).order('applied_on', { ascending: false });
    if (lnData) {
      setLoans(lnData);
      const loanIds = lnData.map(l => l.loan_id);
      if (loanIds.length > 0) {
        const { data: schedData } = await supabase.from('repayment_schedule').select('*').in('loan_id', loanIds).order('due_date', { ascending: true });
        if (schedData) setSchedules(schedData);
      }
    }
  }

  useEffect(() => { loadData(); }, [customerId]);

  // Live EMI preview (PRD Section 10 requirement)
  const emiPreview = useMemo(() => {
    const P = parseFloat(amount);
    const n = parseInt(tenure);
    const r = (rateMap[type] || 12.5) / 100 / 12;
    if (!P || !n || P <= 0 || n <= 0) return null;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - P;
    return { emi, total, interest };
  }, [amount, tenure, type]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('loan').insert([{
      customer_id: customerId,
      principal_amount: parseFloat(amount),
      interest_rate: rateMap[type] || 12.5,
      tenure_months: parseInt(tenure),
      loan_type: type
    }]);
    setAmount(''); setTenure(''); setType('Personal');
    loadData();
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const fmtD = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const statusColor = (s: string) => s === 'Approved' ? 'success' : s === 'Pending' ? 'warning' : s === 'Rejected' ? 'danger' : 'neutral';

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Loan Services</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Apply for loans and track your EMI schedules. Schedules are auto-generated upon admin approval.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '24px' }} className="fade-in delay-1">
        {/* Application Form */}
        <div style={{ position: 'sticky', top: '36px', alignSelf: 'start' }}>
          <div className="glass-panel-static">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--accent-primary)" /> Apply for Loan
            </h3>
            <form onSubmit={handleApply}>
              <div className="form-group">
                <label>Loan Type</label>
                <select className="form-control" value={type} onChange={e => setType(e.target.value)}>
                  <option value="Personal">Personal Loan ({rateMap.Personal}% p.a.)</option>
                  <option value="Home">Home Loan ({rateMap.Home}% p.a.)</option>
                  <option value="Auto">Auto Loan ({rateMap.Auto}% p.a.)</option>
                  <option value="Education">Education Loan ({rateMap.Education}% p.a.)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Loan Amount (₹)</label>
                <input type="number" min="10000" className="form-control" placeholder="e.g. 500000" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Tenure (Months)</label>
                <input type="number" min="6" max="360" className="form-control" placeholder="e.g. 60" value={tenure} onChange={e => setTenure(e.target.value)} required />
              </div>

              {/* EMI Preview */}
              {emiPreview && (
                <div style={{
                  padding: '16px', background: 'rgba(var(--accent-primary-rgb), 0.05)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(var(--accent-primary-rgb), 0.1)',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--accent-primary)', fontSize: '0.82rem', fontWeight: 600 }}>
                    <Calculator size={14} /> EMI Preview
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Monthly EMI</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>₹{fmt(emiPreview.emi)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Interest</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>₹{fmt(emiPreview.interest)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Payable</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{fmt(emiPreview.total)}</div>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                <FileText size={16} /> Submit Application
              </button>
            </form>
          </div>
        </div>

        {/* Loans List */}
        <div>
          {loans.length === 0 ? (
            <div className="glass-panel-static">
              <div className="empty-state">
                <FileText size={48} />
                <h4>No Loans Found</h4>
                <p>Apply for your first loan using the form.</p>
              </div>
            </div>
          ) : (
            loans.map(loan => {
              const loanSchedules = schedules.filter(s => s.loan_id === loan.loan_id);
              const isExpanded = expandedLoan === loan.loan_id;

              return (
                <div key={loan.loan_id} className="glass-panel" style={{ marginBottom: '16px' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{loan.loan_type} Loan</h4>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                        {loan.tenure_months} months @ {loan.interest_rate}% p.a. • Applied {new Date(loan.applied_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${statusColor(loan.status)}`}>{loan.status}</span>
                      <div style={{ marginTop: '8px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                        ₹{fmtD(Number(loan.principal_amount))}
                      </div>
                    </div>
                  </div>

                  {loanSchedules.length > 0 ? (
                    <>
                      <div className="divider" style={{ margin: '12px 0' }} />
                      <button
                        onClick={() => setExpandedLoan(isExpanded ? null : loan.loan_id)}
                        className="btn-secondary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '0.85rem' }}
                      >
                        <Calendar size={15} />
                        {isExpanded ? 'Hide' : 'Show'} EMI Schedule ({loanSchedules.length} installments)
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      {isExpanded && (
                        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }} className="fade-in">
                          {loanSchedules.map((sch, i) => (
                            <div key={sch.schedule_id} style={{
                              background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${sch.pay_status === 'Paid' ? 'rgba(var(--success-rgb), 0.15)' : sch.pay_status === 'Overdue' ? 'rgba(var(--danger-rgb), 0.15)' : 'var(--border-subtle)'}`
                            }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>M-{i + 1}: {sch.due_date}</div>
                              <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>₹{fmt(Number(sch.emi_amount))}</div>
                              <span className={`badge ${sch.pay_status === 'Paid' ? 'success' : sch.pay_status === 'Overdue' ? 'danger' : 'warning'}`} style={{ marginTop: '6px', fontSize: '0.68rem' }}>
                                {sch.pay_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '8px' }}>
                      {loan.status === 'Pending' ? '⏳ EMI Schedule will be auto-generated upon admin approval.' : 'No schedule generated.'}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
