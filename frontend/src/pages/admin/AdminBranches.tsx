import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, X, Save, Building } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminBranches() {
  const [branches, setBranches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ branch_name: '', address: '', pincode: '' });
  const { user } = useAuth();

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase.from('branch').select('*').order('branch_name');
    if (error) {
      console.error('Failed to load branches:', error.message);
      // Consider adding toast notification or error state
    } else if (data) {
      setBranches(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (editId) {
      await supabase.from('branch').update(form).eq('branch_id', editId);
    } else {
      await supabase.from('branch').insert([form]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ branch_name: '', address: '', pincode: '' });
    loadData();
  };

  const startEdit = (b: any) => {
    setEditId(b.branch_id);
    setForm({ branch_name: b.branch_name, address: b.address, pincode: b.pincode });
    setShowForm(true);
  };

  const filtered = branches.filter(b =>
    (b.branch_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.address ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.pincode ?? '').includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-normal tracking-wide uppercase text-primary">Branch Management</h1>
          <p className="text-sm text-secondary mt-1">Manage physical bank branches (REQ-18)</p>
        </div>

        {user?.role === 'admin' && (
          <button
            className="inline-flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-full font-medium tracking-wide hover:bg-[#6c5e6a] transition-all active:scale-95 shadow-md flex-shrink-0"
            onClick={() => { setShowForm(true); setEditId(null); setForm({ branch_name: '', address: '', pincode: '' }); }}
          >
            <Plus size={18} /> Add Branch
          </button>
        )}
      </div>

      {/* Add/Edit Form Slide-Down */}
      {showForm && (
        <div className="mb-8 bg-card rounded-[32px] p-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 relative border border-secondary/10">
          <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-app transition-colors" onClick={() => { setShowForm(false); setEditId(null); }}>
            <X size={20} />
          </button>

          <h3 className="text-xl font-medium text-primary mb-6 flex items-center gap-2">
            <Building size={24} className="text-secondary" />
            {editId ? 'Edit Branch Details' : 'Register New Branch'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label htmlFor="branch-name" className="text-[13px] font-medium text-primary px-2">Branch Name</label>
              <input id="branch-name" type="text" className="w-full bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30" value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} placeholder="e.g. South Mumbai Branch" />
            </div>
            <div className="space-y-1">
              <label htmlFor="pincode" className="text-[13px] font-medium text-primary px-2">Pincode</label>
              <input id="pincode" type="text" className="w-full bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="e.g. 400001" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="address" className="text-[13px] font-medium text-primary px-2">Full Address</label>
              <input id="address" type="text" className="w-full bg-app text-primary rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="e.g. 123 Banking Street, Mumbai" />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="bg-primary text-white border border-transparent px-8 py-3 rounded-full font-medium tracking-wide hover:bg-[#362e34] transition-all active:scale-95 shadow-md flex items-center gap-2" onClick={handleSave}>
              <Save size={18} /> {editId ? 'Update Branch' : 'Save Branch'}
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
            <input type="text" className="w-full bg-app text-primary rounded-full pl-12 pr-6 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all shadow-sm" placeholder="Search branches..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-accent-teal/10 text-accent-teal tracking-wide shadow-sm whitespace-nowrap">
            {branches.length} branches
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
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Branch Name</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Address</th>
                  <th className="pb-4 text-[11px] tracking-wider uppercase font-semibold text-secondary px-2">Pincode</th>
                  <th className="pb-4 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {filtered.map(b => (
                  <tr key={b.branch_id} className="hover:bg-app/30 transition-colors">
                    <td className="py-4 px-2 font-medium text-[14px] text-primary whitespace-nowrap">{b.branch_name}</td>
                    <td className="py-4 px-2 text-[14px] text-secondary">{b.address}</td>
                    <td className="py-4 px-2 text-[14px] font-mono tracking-wide text-secondary">{b.pincode}</td>
                    <td className="py-4 px-2 text-right">
                      {user?.role === 'admin' ? (
                        <button className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-app text-secondary hover:text-primary hover:shadow-sm transition-all" onClick={() => startEdit(b)}>
                          Edit
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-secondary/10 text-secondary tracking-wide">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-secondary py-16">
                      {searchTerm ? 'No branches match your search.' : 'No branches registered.'}
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
