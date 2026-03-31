import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Clock, Trash2, Users, AlertCircle } from 'lucide-react';

export default function Beneficiaries() {
  const { customerId } = useAuth();
  const [bens, setBens] = useState<any[]>([]);

  const [name, setName] = useState('');
  const [accNum, setAccNum] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bank, setBank] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  async function loadData() {
    const { data } = await supabase.from('beneficiary').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (data) setBens(data);
  }

  useEffect(() => { loadData(); }, [customerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg({ text: '', type: '' });

    // IFSC validation (REQ-14)
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
      setStatusMsg({ text: 'Invalid IFSC code format. Must be like HDFC0001234.', type: 'danger' });
      return;
    }

    const { error } = await supabase.from('beneficiary').insert([{
      customer_id: customerId,
      payee_name: name,
      account_number: accNum,
      ifsc_code: ifsc.toUpperCase(),
      bank_name: bank,
    }]);

    if (error) {
      setStatusMsg({ text: error.message, type: 'danger' });
    } else {
      setStatusMsg({ text: 'Beneficiary added! 24-hour cooling period applies.', type: 'success' });
      setName(''); setAccNum(''); setIfsc(''); setBank('');
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this beneficiary?')) return;
    await supabase.from('beneficiary').delete().eq('beneficiary_id', id);
    loadData();
  };

  const isCooling = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return now - created < 24 * 60 * 60 * 1000;
  };

  const cooldownRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const remaining = (created + 24 * 60 * 60 * 1000) - Date.now();
    if (remaining <= 0) return '';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <>
      <div className="page-header fade-in">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Manage Beneficiaries</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Add saved payees for NEFT/RTGS transfers. 24-hour cooling period applies for new additions.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 400px) 1fr', gap: '24px' }} className="fade-in delay-1">
        {/* Add Form */}
        <div className="glass-panel-static" style={{ alignSelf: 'start', position: 'sticky', top: '36px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '1.05rem' }}>
            <UserPlus size={20} color="var(--accent-primary)" /> Add New Payee
          </h3>

          {statusMsg.text && (
            <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
              <AlertCircle size={16} /> {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Payee Name</label>
              <input type="text" className="form-control" placeholder="e.g. Roopesh K" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Account Number</label>
              <input type="text" className="form-control" placeholder="e.g. 1234567890" value={accNum} onChange={e => setAccNum(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>IFSC Code</label>
              <input type="text" className="form-control" placeholder="e.g. HDFC0001234" value={ifsc} onChange={e => setIfsc(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Bank Name</label>
              <input type="text" className="form-control" placeholder="e.g. HDFC Bank" value={bank} onChange={e => setBank(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              <UserPlus size={16} /> Save Beneficiary
            </button>

            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'var(--warning)', fontSize: '0.8rem' }}>
              <Clock size={13} /> 24-hour cooling period will apply
            </div>
          </form>
        </div>

        {/* List */}
        <div className="glass-panel-static" style={{ alignSelf: 'start' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '1.05rem' }}>
            <Users size={20} color="var(--accent-secondary)" /> Saved Payees
          </h3>

          {bens.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h4>No Beneficiaries</h4>
              <p>Add your first payee to start making transfers.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Bank / IFSC</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bens.map(b => (
                  <tr key={b.beneficiary_id}>
                    <td style={{ fontWeight: 600 }}>{b.payee_name}</td>
                    <td>
                      {b.bank_name}<br />
                      <span className="text-mono" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{b.ifsc_code}</span>
                    </td>
                    <td className="text-mono" style={{ fontSize: '0.85rem' }}>{b.account_number}</td>
                    <td>
                      {isCooling(b.created_at) ? (
                        <div>
                          <span className="badge warning">Cooling</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                            {cooldownRemaining(b.created_at)}
                          </div>
                        </div>
                      ) : (
                        <span className="badge success">Active</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => handleDelete(b.beneficiary_id)} title="Remove">
                        <Trash2 size={15} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
