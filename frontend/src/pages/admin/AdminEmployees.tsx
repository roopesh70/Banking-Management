import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, X, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: '', department: '', branch_id: '' });
  const { user } = useAuth();

  async function loadData() {
    setLoading(true);
    
    let empQuery = supabase.from('employee').select('*, branch:branch_id(branch_name)').order('name');
    let branchQuery = supabase.from('branch').select('*');
    
    if (user?.role === 'manager' && user.branch_id) {
      empQuery = empQuery.eq('branch_id', user.branch_id);
      branchQuery = branchQuery.eq('branch_id', user.branch_id);
    }

    const [empRes, branchRes] = await Promise.all([ empQuery, branchQuery ]);
    
    if (empRes.data) setEmployees(empRes.data);
    if (branchRes.data) setBranches(branchRes.data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (editId) {
      await supabase.from('employee').update(form).eq('employee_id', editId);
    } else {
      await supabase.from('employee').insert([form]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', role: '', department: '', branch_id: '' });
    loadData();
  };

  const startEdit = (emp: any) => {
    setEditId(emp.employee_id);
    setForm({ name: emp.name, role: emp.role, department: emp.department, branch_id: emp.branch_id || '' });
    setShowForm(true);
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient-purple" style={{ fontSize: '1.75rem' }}>Employee Management</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Manage bank staff records and branch assignments (REQ-20, REQ-21)
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', role: '', department: '', branch_id: '' }); }}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="glass-panel-static fade-in-scale" style={{ maxWidth: '600px', marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3>{editId ? 'Edit Employee' : 'Add New Employee'}</h3>
            <button className="btn-icon" onClick={() => { setShowForm(false); setEditId(null); }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sreya Binoi" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input type="text" className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Teller, Manager" />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input type="text" className="form-control" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Operations" />
            </div>
            <div className="form-group">
              <label>Branch</label>
              <select className="form-control" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                <option value="">— Select Branch —</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
              </select>
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave} style={{ marginTop: '8px' }}>
            <Save size={16} /> {editId ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      )}

      <div className="glass-panel-static fade-in delay-1">
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input type="text" className="search-input" placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%' }} />
          </div>
          <span className="badge info">{employees.length} employees</span>
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
                  <th>Role</th>
                  <th>Department</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.employee_id}>
                    <td style={{ fontWeight: 600 }}>{emp.name}</td>
                    <td><span className="badge neutral">{emp.role}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{emp.department}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{(emp.branch as any)?.branch_name || '—'}</td>
                    <td>
                      {user?.role === 'admin' ? (
                        <button className="btn-secondary" onClick={() => startEdit(emp)} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                          Edit
                        </button>
                      ) : (
                        <span className="badge info">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px' }}>No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
