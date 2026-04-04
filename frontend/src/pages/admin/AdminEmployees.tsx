import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, X, Save, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: '', department: '', branch_id: '', managed_branch_id: null as string | null });
  const { user } = useAuth();

  async function loadData() {
    setLoading(true);

    let empQuery = supabase.from('employee').select('*, branch:branch_id(branch_name)').order('name');
    let branchQuery = supabase.from('branch').select('*');

    if (user?.role === 'manager' && user.branch_id) {
      empQuery = empQuery.eq('branch_id', user.branch_id);
      branchQuery = branchQuery.eq('branch_id', user.branch_id);
    }

    const [empRes, branchRes] = await Promise.all([empQuery, branchQuery]);

    if (empRes.data) setEmployees(empRes.data);
    if (branchRes.data) setBranches(branchRes.data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    const payload = { ...form, managed_branch_id: form.role.toLowerCase() === 'manager' ? form.managed_branch_id || null : null };
    let error;
    if (editId) {
      ({ error } = await supabase.from('employee').update(payload).eq('employee_id', editId));
    } else {
      ({ error } = await supabase.from('employee').insert([payload]));
    }
    if (error) {
      // Consider using a toast notification or error state
      console.error('Failed to save employee:', error.message);
      return;
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', role: '', department: '', branch_id: '', managed_branch_id: null });
    loadData();
  };

  const startEdit = (emp: any) => {
    setEditId(emp.employee_id);
    setForm({ name: emp.name, role: emp.role, department: emp.department, branch_id: emp.branch_id || '', managed_branch_id: emp.managed_branch_id || null });
    setShowForm(true);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('employee').update({ is_active: !currentStatus }).eq('employee_id', id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-wide uppercase text-primary">Employee Management</h1>
          <p className="text-sm text-secondary mt-1">Manage bank staff records and branch assignments (REQ-20, REQ-21)</p>
        </div>

        {user?.role === 'admin' && (
          <button
            className="inline-flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-full font-medium tracking-wide hover:bg-[#6c5e6a] transition-all active:scale-95 shadow-md"
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', role: '', department: '', branch_id: '', managed_branch_id: null }); }}
          >
            <Plus size={18} /> Add Employee
          </button>
        )}
      </div>

      {/* Add/Edit Form Slide-Down */}
      {showForm && (
        <div className="mb-8 bg-card rounded-[32px] p-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 relative border border-secondary/10">
          <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-app transition-colors" onClick={() => { setShowForm(false); setEditId(null); }}>
            <X size={20} />
          </button>

          <h3 className="text-xl font-medium text-primary mb-6">{editId ? 'Edit Employee' : 'Add New Employee'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-primary px-2">Full Name</label>
              <input type="text" className="w-full bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sreya Binoi" />
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-primary px-2">Role</label>
              <input type="text" className="w-full bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Teller, Manager" />
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-primary px-2">Department</label>
              <input type="text" className="w-full bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Operations" />
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-medium text-primary px-2">Assigned Branch (Work Location)</label>
              <select className="w-full bg-app text-primary rounded-full px-5 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-secondary/30 appearance-none" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                <option value="" disabled>— Select Branch —</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
              </select>
            </div>
            {form.role.toLowerCase() === 'manager' && (
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-primary px-2">Manages Branch (Authority)</label>
                <select className="w-full bg-accent-gold/10 text-primary rounded-full px-5 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent-gold/50 appearance-none border border-accent-gold/20" value={form.managed_branch_id || ''} onChange={e => setForm({ ...form, managed_branch_id: e.target.value })}>
                  <option value="">— None (Or select Branch) —</option>
                  {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button className="bg-primary text-white border border-transparent px-8 py-3 rounded-full font-medium tracking-wide hover:bg-[#362e34] transition-all active:scale-95 shadow-md flex items-center gap-2" onClick={handleSave}>
              <Save size={18} /> {editId ? 'Update Employee' : 'Add Employee'}
            </button>
          </div>
        </div>
      )}

      {/* Main List Box */}
      <div className="bg-card rounded-[40px] p-6 md:p-10 shadow-sm min-h-[500px]">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-lg">
            <Search size={18} className="absolute top-1/2 left-5 -translate-y-1/2 text-secondary" />
            <input type="text" className="w-full bg-app text-primary rounded-full pl-12 pr-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all shadow-sm" placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-accent-gold/10 text-accent-gold tracking-wide shadow-sm whitespace-nowrap">
            {employees.length} employees
          </span>
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
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Name</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Role</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Department</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Branch Assignment</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2 text-center">Status</th>
                  <th className="pb-4 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {filtered.map(emp => (
                  <tr key={emp.employee_id} className={`hover:bg-app/30 transition-colors ${emp.is_active === false ? 'opacity-60' : ''}`}>
                    <td className="py-4 px-2 font-medium text-[14px] text-primary whitespace-nowrap">{emp.name}</td>
                    <td className="py-4 px-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-app border border-black/5 text-primary tracking-wide">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-[14px] text-secondary">{emp.department}</td>
                    <td className="py-4 px-2 text-[14px] text-secondary">
                      {(emp.branch as any)?.branch_name || '—'}
                      {emp.managed_branch_id && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-accent-gold/10 text-accent-gold tracking-wide uppercase">Manager</span>}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${emp.is_active === false ? 'bg-accent-rose/10 text-accent-rose' : 'bg-accent-teal/10 text-accent-teal'}`}>
                        {emp.is_active === false ? 'INACTIVE' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right whitespace-nowrap">
                      {user?.role === 'admin' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-app text-secondary hover:text-primary hover:shadow-sm transition-all" onClick={() => startEdit(emp)}>
                            Edit
                          </button>
                          <button
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${emp.is_active !== false ? 'text-accent-rose hover:bg-accent-rose/10' : 'text-accent-teal hover:bg-accent-teal/10'}`}
                            onClick={() => toggleActive(emp.employee_id, emp.is_active !== false)}
                          >
                            {emp.is_active !== false ? <><UserX size={14} /> Disable</> : <><UserCheck size={14} /> Enable</>}
                          </button>
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-secondary/10 text-secondary tracking-wide">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary py-16">
                      {searchTerm ? 'No employees match your search.' : 'No employees found.'}
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
