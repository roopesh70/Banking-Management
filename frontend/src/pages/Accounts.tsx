import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, PlusCircle, CheckCircle2, Landmark, Sparkles, Repeat, ShieldCheck, Printer, Edit2, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';
import { formatDate, formatDateTime } from '../lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const limitFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const accountOptions = [
  { type: 'Savings', icon: Landmark, color: 'text-accent-teal', bgClass: 'hover:bg-accent-teal/5 border-accent-teal', indicatorClass: 'bg-accent-teal', description: 'Ideal for personal savings.', features: ['No minimum balance', '₹5,000 credit', '4.5% annual interest'] },
  { type: 'Current', icon: Sparkles, color: 'text-secondary', bgClass: 'hover:bg-[#877685]/5 border-secondary', indicatorClass: 'bg-secondary', description: 'Perfect for business.', features: ['Higher daily limits', '₹5,000 credit', 'Overdraft facility'] }
];

export default function Accounts() {
  const { user } = useAuth();
  const customerId = user?.id;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, statement, recurring, new

  const [statementData, setStatementData] = useState<any[]>([]);
  const [selectedStatementAccount, setSelectedStatementAccount] = useState('');

  // New Account State
  const [accountType, setAccountType] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [creationLoading, setCreationLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Limit Edit State
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [newLimitValue, setNewLimitValue] = useState('');

  // Kiosk State
  const [kioskAccount, setKioskAccount] = useState('');
  const [kioskAmount, setKioskAmount] = useState('');
  const [kioskType, setKioskType] = useState<'Deposit' | 'Withdrawal'>('Deposit');
  const [kioskLoading, setKioskLoading] = useState(false);
  const [kioskMsg, setKioskMsg] = useState({ text: '', type: '' });

  // Standing Instructions State
  const [instructions, setInstructions] = useState<any[]>([]);
  const [instLoading, setInstLoading] = useState(false);
  const [instMsg, setInstMsg] = useState({ text: '', type: '' });
  const [instForm, setInstForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    frequency: 'Monthly',
    nextDate: ''
  });
  const [editingInstructionId, setEditingInstructionId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [customerId]);

  const loadAccounts = async () => {
    setLoading(true);
    if (!customerId) return;
    const { data } = await supabase.from('account').select('*, branch:branch_id(branch_name)').eq('customer_id', customerId);
    if (data) {
      setAccounts(data);
      if (data.length > 0) setSelectedStatementAccount(data[0].account_id);
    }
    const { data: bData } = await supabase.from('branch').select('*').order('branch_name');
    if (bData) setBranches(bData);
    setLoading(false);
  };

  const loadStatement = async () => {
    if (!selectedStatementAccount) return;
    const { data } = await supabase
      .from('transaction')
      .select('*, from_account:from_account_id(account_number), to_account:to_account_id(account_number), beneficiary:beneficiary_id(payee_name)')
      .or(`from_account_id.eq.${selectedStatementAccount},to_account_id.eq.${selectedStatementAccount}`)
      .order('timestamp', { ascending: false })
      .limit(10);
    if (data) setStatementData(data);
  };

  const loadInstructions = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('standing_instruction')
      .select('*, from:from_account_id(account_number, account_type), to:to_account_id(account_number, account_type)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (data) setInstructions(data);
  };

  useEffect(() => {
    if (activeTab === 'statement') loadStatement();
    if (activeTab === 'recurring') loadInstructions();
  }, [selectedStatementAccount, activeTab, customerId]);

  const handleCreateInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstLoading(true);
    setInstMsg({ text: '', type: '' });

    if (instForm.fromAccountId === instForm.toAccountId) {
      setInstMsg({ text: 'Source and Destination accounts cannot be the same.', type: 'danger' });
      setInstLoading(false);
      return;
    }

    const fromAcc = accounts.find(a => a.account_id === instForm.fromAccountId);
    const toAcc = accounts.find(a => a.account_id === instForm.toAccountId);

    if (fromAcc?.status !== 'Active' || (toAcc && toAcc.status !== 'Active')) {
      setInstMsg({ text: 'Transactions are only allowed for Active accounts.', type: 'danger' });
      setInstLoading(false);
      return;
    }

    try {
      const payload = {
        customer_id: customerId,
        from_account_id: instForm.fromAccountId,
        to_account_id: instForm.toAccountId,
        amount: parseFloat(instForm.amount),
        frequency: instForm.frequency,
        next_execution_date: instForm.nextDate
      };

      if (editingInstructionId) {
        const { error } = await supabase.from('standing_instruction').update(payload).eq('instruction_id', editingInstructionId);
        if (error) throw error;
        setInstMsg({ text: 'Standing instruction successfully updated.', type: 'success' });
      } else {
        const { error } = await supabase.from('standing_instruction').insert([payload]);
        if (error) throw error;
        setInstMsg({ text: 'Standing instruction successfully created.', type: 'success' });
      }

      setInstForm({ fromAccountId: '', toAccountId: '', amount: '', frequency: 'Monthly', nextDate: '' });
      setEditingInstructionId(null);
      loadInstructions();
    } catch (err: any) {
      setInstMsg({ text: err.message, type: 'danger' });
    } finally {
      setInstLoading(false);
    }
  };

  const togglePauseInstruction = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Paused' ? 'Active' : 'Paused';
      const { error } = await supabase.from('standing_instruction').update({ status: newStatus }).eq('instruction_id', id);
      if (error) throw error;
      loadInstructions();
    } catch (err: any) {
      setInstMsg({ text: `Failed to update status: ${err.message}`, type: 'danger' });
    }
  };

  const startEditing = (inst: any) => {
    setEditingInstructionId(inst.instruction_id);
    setInstForm({
      fromAccountId: inst.from_account_id,
      toAccountId: inst.to_account_id,
      amount: inst.amount.toString(),
      frequency: inst.frequency,
      nextDate: inst.next_execution_date
    });
    // Scroll to form for better UX
    document.getElementById('instruction-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingInstructionId(null);
    setInstForm({ fromAccountId: '', toAccountId: '', amount: '', frequency: 'Monthly', nextDate: '' });
  };

  const cancelInstruction = async (id: string) => {
    await supabase.from('standing_instruction').update({ status: 'Cancelled' }).eq('instruction_id', id);
    loadInstructions();
  };

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountType) return;
    if (!selectedBranchId) {
      setMsg({ text: 'Please select a Home Branch before proceeding.', type: 'danger' });
      return;
    }
    setCreationLoading(true);
    setMsg({ text: '', type: '' });

    const generatedAccNo = 'AC' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

    try {
      const { error } = await supabase.from('account').insert([{
        customer_id: customerId,
        account_type: accountType,
        account_number: generatedAccNo,
        balance: 5000.00,
        status: 'Active',
        branch_id: selectedBranchId,
      }]);

      if (error) throw error;

      setMsg({ text: `✓ ${accountType} Account created: #${generatedAccNo}. ₹5,000 credited!`, type: 'success' });
      setAccountType('');
      setSelectedBranchId('');
      loadAccounts();
      setTimeout(() => setActiveTab('overview'), 2000);
    } catch (err: any) {
      setMsg({ text: err.message, type: 'danger' });
    } finally {
      setCreationLoading(false);
    }
  };

  const handleUpdateLimit = async (accId: string) => {
    if (!newLimitValue || isNaN(Number(newLimitValue)) || Number(newLimitValue) < 1000) {
      alert("Please enter a valid limit (minimum 1000).");
      return;
    }
    await supabase.from('account').update({ daily_transaction_limit: Number(newLimitValue) }).eq('account_id', accId);
    setEditingLimitId(null);
    setNewLimitValue('');
    loadAccounts();
  };

  const handleKioskTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setKioskLoading(true);
    setKioskMsg({ text: '', type: '' });

    if (!kioskAccount || !kioskAmount || Number(kioskAmount) <= 0) {
      setKioskMsg({ text: 'Please fill out all fields correctly.', type: 'danger' });
      setKioskLoading(false);
      return;
    }

    const selectedAcc = accounts.find(a => a.account_id === kioskAccount);
    if (!selectedAcc || selectedAcc.status !== 'Active') {
      setKioskMsg({ text: `This account is ${selectedAcc?.status || 'invalid'} and cannot perform transactions.`, type: 'danger' });
      setKioskLoading(false);
      return;
    }

    try {
      const payload: any = {
        amount: parseFloat(kioskAmount),
        type: kioskType,
      };

      if (kioskType === 'Deposit') {
        payload.to_account_id = kioskAccount;
      } else {
        payload.from_account_id = kioskAccount;
      }

      const { error } = await supabase.from('transaction').insert([payload]);
      if (error) throw error;

      setKioskMsg({ text: `${kioskType} of ₹${parseFloat(kioskAmount)} completed successfully.`, type: 'success' });
      setKioskAmount('');
      loadAccounts();
    } catch (err: any) {
      setKioskMsg({ text: err.message, type: 'danger' });
    } finally {
      setKioskLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-secondary">Loading accounts...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Print-only CSS embedded */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px;}
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-wide uppercase text-primary">My Accounts</h1>
          <p className="text-sm text-secondary mt-1">Manage accounts, statements, and instructions.</p>
        </div>
        <button 
          onClick={() => setActiveTab('new')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-primary text-white hover:bg-[#362e34] transition-all shadow-sm active:scale-95"
        >
          <PlusCircle size={18} /> Open New Account
        </button>
      </div>

      <div className="flex gap-4 border-b border-app mb-8 no-print overflow-x-auto">
        {['overview', 'kiosk', 'statement', 'recurring'].map(tab => (
          <button
            key={tab}
            className={`pb-4 px-2 text-sm font-medium capitalize tracking-wide transition-colors relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-secondary hover:text-primary'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'recurring' ? 'Standing Instructions' : tab === 'kiosk' ? 'Self-Service Kiosk' : tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <div key={acc.account_id} className="bg-gradient-to-br from-[#4a3f48] to-[#2c252b] text-white rounded-[24px] p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="opacity-80 text-sm mb-1">{acc.account_type} Account</p>
                  <p className="font-mono tracking-widest text-lg">{acc.account_number}</p>
                  <p className="opacity-70 text-xs mt-1">{(acc.branch as any)?.branch_name || 'Main Branch'}</p>
                </div>
                <CreditCard size={24} className="opacity-80" />
              </div>
              <div className="space-y-1 mb-4">
                <p className="opacity-60 text-xs uppercase tracking-wider">Available Balance</p>
                <p className="text-2xl font-light">₹{currencyFormatter.format(acc.balance)}</p>
              </div>
              <div className="flex justify-between items-center text-xs opacity-70">
                <div className="flex items-center gap-2">
                  {editingLimitId === acc.account_id ? (
                    <div className="flex items-center gap-2 bg-black/20 rounded-full px-2 py-1">
                      <span className="opacity-70">₹</span>
                      <input 
                        type="number" 
                        autoFocus
                        className="w-20 bg-transparent outline-none font-mono text-white text-xs placeholder-white/40"
                        placeholder="Limit"
                        value={newLimitValue}
                        onChange={e => setNewLimitValue(e.target.value)}
                        onBlur={() => setEditingLimitId(null)}
                        onKeyDown={e => { if(e.key === 'Enter') handleUpdateLimit(acc.account_id); if(e.key === 'Escape') setEditingLimitId(null); }}
                      />
                    </div>
                  ) : (
                    <>
                      <span>Limit: ₹{limitFormatter.format(acc.daily_transaction_limit)}</span>
                      <button onClick={() => { setEditingLimitId(acc.account_id); setNewLimitValue(acc.daily_transaction_limit.toString()); }} className="hover:text-white hover:scale-110 transition-all"><Edit2 size={12} /></button>
                    </>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full ${acc.status === 'Active' ? 'bg-accent-teal/20 text-accent-teal' : 'bg-red-500/20 text-red-300'}`}>{acc.status}</span>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="col-span-full text-center py-12 text-secondary bg-card rounded-[30px]">
              No accounts found. Open a new account to begin!
            </div>
          )}
        </div>
      )}

      {/* KIOSK TAB */}
      {activeTab === 'kiosk' && (
        <div className="bg-card rounded-[30px] p-8 shadow-sm text-center max-w-lg mx-auto">
          <div className="flex justify-center gap-4 mb-6">
            <button onClick={() => setKioskType('Deposit')} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all w-32 ${kioskType === 'Deposit' ? 'border-accent-teal bg-accent-teal/10 text-accent-teal' : 'border-app text-secondary hover:bg-app'}`}>
              <ArrowDownCircle size={32} className="mb-2" />
              <span className="font-medium text-sm">Deposit</span>
            </button>
            <button onClick={() => setKioskType('Withdrawal')} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all w-32 ${kioskType === 'Withdrawal' ? 'border-accent-rose bg-accent-rose/10 text-accent-rose' : 'border-app text-secondary hover:bg-app'}`}>
              <ArrowUpCircle size={32} className="mb-2" />
              <span className="font-medium text-sm">Withdraw</span>
            </button>
          </div>

          <h2 className="text-xl font-semibold text-primary mb-2 text-left px-2">Cash {kioskType}</h2>
          <p className="text-sm text-secondary mb-6 text-left px-2">Instantly add or remove cash securely.</p>
          
          {kioskMsg.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${kioskMsg.type === 'success' ? 'bg-accent-teal/10 text-accent-teal' : 'bg-accent-rose/10 text-accent-rose'}`}>
              {kioskMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} 
              {kioskMsg.text}
            </div>
          )}

          <form onSubmit={handleKioskTx} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary px-2">Select Account</label>
              <select className="w-full bg-app rounded-full px-5 py-4 focus:outline-none focus:ring-2 focus:ring-secondary/30" required value={kioskAccount} onChange={e => setKioskAccount(e.target.value)}>
                <option value="" disabled>— Choose Account —</option>
                {accounts.map(a => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_type} - {a.account_number} (₹{a.balance}){a.status !== 'Active' ? ` — ${a.status.toUpperCase()}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-primary px-2">Amount (₹)</label>
              <input type="number" min="1" step="0.01" className="w-full bg-app text-xl font-mono tracking-wider rounded-[24px] px-5 py-4 focus:outline-none focus:ring-2 focus:ring-secondary/30 border border-transparent" required placeholder="0.00" value={kioskAmount} onChange={e => setKioskAmount(e.target.value)} />
            </div>
            <button 
              type="submit" 
              disabled={!!kioskLoading || !!(kioskAccount && accounts.find(a => a.account_id === kioskAccount)?.status !== 'Active')} 
              className={`w-full text-white font-semibold flex items-center justify-center gap-2 py-4 rounded-full transition-all active:scale-95 mt-4 disabled:opacity-50 ${kioskType === 'Deposit' ? 'bg-accent-teal hover:bg-teal-600' : 'bg-primary hover:bg-[#362e34]'}`}
            >
              {kioskLoading ? 'Processing...' : (kioskAccount && accounts.find(a => a.account_id === kioskAccount)?.status !== 'Active') ? `Cannot ${kioskType} (Account ${accounts.find(a => a.account_id === kioskAccount)?.status})` : `Confirm ${kioskType}`}
            </button>
          </form>
        </div>
      )}

      {/* STATEMENTS TAB */}
      {activeTab === 'statement' && (
        <div className="bg-card rounded-[30px] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-8 no-print">
            <select
              className="bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 min-w-[250px]"
              value={selectedStatementAccount}
              onChange={e => setSelectedStatementAccount(e.target.value)}
            >
              {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_type} - {a.account_number}</option>)}
            </select>
            <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 bg-secondary text-white rounded-full px-6 py-3 font-medium text-sm hover:bg-[#6c5e6a] transition-all">
              <Printer size={18} /> Download PDF (Print)
            </button>
          </div>

          <div id="print-area" className="bg-white p-6 rounded-2xl print:shadow-none print:w-full print:block">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 uppercase tracking-wide">AeroBank Mini-Statement</h2>
              <p className="text-gray-500 text-sm mt-1">Generated on: {formatDateTime(new Date())}</p>
              <p className="text-gray-700 font-medium mt-4">Account: {accounts.find(a => a.account_id === selectedStatementAccount)?.account_number || 'N/A'}</p>
            </div>
            
            <table className="w-full text-left text-sm text-gray-700">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Ref ID</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold text-right">Debit</th>
                  <th className="pb-3 font-semibold text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statementData.map(tx => {
                  const isDebit = tx.from_account_id === selectedStatementAccount;
                  return (
                    <tr key={tx.transaction_id}>
                      <td className="py-4">{formatDate(tx.timestamp)}</td>
                      <td className="py-4 font-mono text-xs">{tx.transaction_ref}</td>
                      <td className="py-4">{tx.type} {tx.type === 'Transfer' ? (isDebit ? `to ${tx.to_account?.account_number || tx.beneficiary?.payee_name}` : `from ${tx.from_account?.account_number}`) : ''}</td>
                      <td className="py-4 text-right">{isDebit ? `₹${tx.amount.toFixed(2)}` : '-'}</td>
                      <td className="py-4 text-right">{!isDebit ? `₹${tx.amount.toFixed(2)}` : '-'}</td>
                    </tr>
                  )
                })}
                {statementData.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No transactions recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STANDING INSTRUCTIONS TAB */}
      {activeTab === 'recurring' && (
        <div className="bg-card rounded-[30px] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Left Side: Create Form */}
            <div className="flex-1 space-y-4">
              <h2 className="text-xl font-semibold text-primary mb-6" id="instruction-form">{editingInstructionId ? 'Modify Recurring Transfer' : 'Setup Recurring Transfer'}</h2>
              
              {instMsg.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${instMsg.type === 'success' ? 'bg-accent-teal/10 text-accent-teal' : 'bg-accent-rose/10 text-accent-rose'}`}>
                  {instMsg.type === 'success' ? <CheckCircle2 size={18} /> : <Repeat size={18} />}
                  {instMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateInstruction} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm text-primary ml-2 font-medium">From Account</label>
                  <select 
                    className="w-full bg-app rounded-full px-5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                    value={instForm.fromAccountId}
                    onChange={e => setInstForm({...instForm, fromAccountId: e.target.value})}
                  >
                    <option value="" disabled>Select Source</option>
                    {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_type} - {a.account_number}{a.status !== 'Active' ? ` — ${a.status.toUpperCase()}` : ''}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-primary ml-2 font-medium">To My Account</label>
                  <select 
                    className="w-full bg-app rounded-full px-5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                    value={instForm.toAccountId}
                    onChange={e => setInstForm({...instForm, toAccountId: e.target.value})}
                  >
                    <option value="" disabled>Select Destination</option>
                    {accounts.map(a => <option key={`to-${a.account_id}`} value={a.account_id}>{a.account_type} - {a.account_number}{a.status !== 'Active' ? ` — ${a.status.toUpperCase()}` : ''}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-primary ml-2 font-medium">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    className="w-full bg-app rounded-full px-5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    required
                    value={instForm.amount}
                    onChange={e => setInstForm({...instForm, amount: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-primary ml-2 font-medium">Frequency</label>
                    <select 
                      className="w-full bg-app rounded-full px-5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/30"
                      value={instForm.frequency}
                      onChange={e => setInstForm({...instForm, frequency: e.target.value})}
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-primary ml-2 font-medium">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-app rounded-full px-5 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/30"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={instForm.nextDate}
                      onChange={e => setInstForm({...instForm, nextDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit" 
                    disabled={!!(instLoading || (instForm.fromAccountId && accounts.find(a => a.account_id === instForm.fromAccountId)?.status !== 'Active') || (instForm.toAccountId && accounts.find(a => a.account_id === instForm.toAccountId)?.status !== 'Active'))}
                    className="flex-1 bg-secondary text-white font-medium py-3 rounded-full mt-2 hover:bg-[#6c5e6a] transition-all disabled:opacity-60 flex justify-center items-center gap-2"
                  >
                    <Repeat size={18} /> {instLoading ? 'Saving...' : (instForm.fromAccountId && accounts.find(a => a.account_id === instForm.fromAccountId)?.status !== 'Active') || (instForm.toAccountId && accounts.find(a => a.account_id === instForm.toAccountId)?.status !== 'Active') ? 'Cannot Set Instruction (Account Not Active)' : (editingInstructionId ? 'Update Instruction' : 'Set Standing Instruction')}
                  </button>
                  {editingInstructionId && (
                    <button 
                      type="button" 
                      onClick={cancelEditing}
                      className="px-6 bg-app text-primary font-medium py-3 rounded-full mt-2 hover:bg-black/5 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right Side: List of Instructions */}
            <div className="flex-1 bg-app rounded-[24px] p-6 h-fit max-h-[500px] overflow-y-auto">
              <h3 className="text-sm uppercase tracking-wide text-secondary mb-4 font-semibold">Active Instructions</h3>
              
              {instructions.length === 0 ? (
                <div className="text-center py-10 text-secondary text-sm">
                  No standing instructions set up yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {instructions.map(inst => (
                    <div key={inst.instruction_id} className="bg-white p-4 rounded-xl shadow-sm border border-black/5 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-primary">₹{currencyFormatter.format(inst.amount)} <span className="text-xs text-secondary font-normal ml-1">({inst.frequency})</span></p>
                          <p className="text-xs text-secondary mt-1">Next Run: {formatDate(inst.next_execution_date)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${inst.status === 'Active' ? 'bg-accent-teal/10 text-accent-teal' : inst.status === 'Paused' ? 'bg-amber-100 text-amber-700' : 'bg-secondary/10 text-secondary'}`}>
                          {inst.status}
                        </span>
                      </div>
                      <div className="bg-app p-2 rounded-lg text-xs text-secondary flex items-center justify-between">
                        <span>From: <span className="text-primary font-mono">{inst.from?.account_number}</span></span>
                        <span>To: <span className="text-primary font-mono">{inst.to?.account_number}</span></span>
                      </div>
                      <div className="flex justify-end gap-3 items-center">
                        {inst.status !== 'Cancelled' && (
                          <>
                            <button onClick={() => startEditing(inst)} className="text-[11px] text-primary hover:underline font-medium">Edit</button>
                            <button onClick={() => togglePauseInstruction(inst.instruction_id, inst.status)} className="text-[11px] text-accent-teal hover:underline font-medium">
                              {inst.status === 'Paused' ? 'Resume' : 'Pause'}
                            </button>
                          </>
                        )}
                        {inst.status === 'Active' && (
                           <button onClick={() => cancelInstruction(inst.instruction_id)} className="text-[11px] text-accent-rose hover:underline font-medium">Cancel Schedule</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OPEN NEW ACCOUNT TAB UI */}
      {activeTab === 'new' && (
        <div className="bg-card rounded-[40px] p-8 md:p-12 shadow-sm transition-all duration-300">
          {msg.text && (
            <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${msg.type === 'success' ? 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20' : 'bg-accent-rose/10 text-accent-rose border border-accent-rose/20'}`}>
              {msg.type === 'success' ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {accountOptions.map(opt => {
              const isSelected = accountType === opt.type;
              return (
                <div key={opt.type} onClick={() => setAccountType(opt.type)} className={`p-6 rounded-[24px] cursor-pointer border-2 transition-all duration-300 relative overflow-hidden group ${isSelected ? `bg-elevated ${opt.bgClass} shadow-md border-opacity-100 scale-[1.02]` : 'bg-app border-transparent hover:border-black/5'}`}>
                  {isSelected && <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-30 ${opt.indicatorClass} -translate-y-1/2 translate-x-1/2`} />}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-shell ${opt.color}`}><opt.icon size={28} /></div>
                  <h3 className="text-xl font-semibold text-primary mb-2">{opt.type} Account</h3>
                  <p className="text-sm text-secondary mb-6 leading-relaxed">{opt.description}</p>
                  <div className="flex flex-col gap-3">
                    {opt.features.map(f => <div key={f} className="flex items-center gap-2 text-sm text-secondary"><CheckCircle2 size={16} className={opt.color} />{f}</div>)}
                  </div>
                  {isSelected && <div className="absolute top-6 right-6"><div className="px-3 py-1 rounded-full bg-accent-teal/10 text-accent-teal text-xs font-semibold uppercase tracking-wider">Selected</div></div>}
                </div>
              );
            })}
          </div>

          <div className="bg-app rounded-[24px] p-6">
            {accountType && (
              <div className="mb-8 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <label className="text-[14px] font-medium text-primary ml-2 flex items-center gap-2">
                  <Landmark size={18} className="text-secondary" /> Select Home Branch
                </label>
                <p className="text-[13px] text-secondary ml-2 mb-3">Your new account will be permanently linked to this physical branch location (REQ-22).</p>
                <select 
                  className="w-full bg-card text-primary border border-black/5 rounded-2xl px-5 py-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none shadow-sm cursor-pointer"
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  required
                >
                  <option value="" disabled>— Select nearest branch —</option>
                  {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.pincode})</option>)}
                </select>
              </div>
            )}

            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 bg-secondary/10 rounded-full text-secondary shrink-0"><ShieldCheck size={20} /></div>
              <p className="text-sm text-secondary leading-relaxed">
                <strong className="text-primary font-medium">Agreement:</strong> By selecting "Open Account", you agree to our banking terms. ₹5,000 will be credited.
              </p>
            </div>
            <button onClick={handleOpenAccount as any} disabled={creationLoading || !accountType || !selectedBranchId} className="w-full bg-secondary text-white rounded-full py-4 font-medium text-[16px] hover:bg-[#6c5e6a] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {creationLoading ? 'Processing...' : <><PlusCircle size={20} />{accountType ? `Open ${accountType} Account` : 'Select an Account Type'}</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
