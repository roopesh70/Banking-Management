import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [roleType, setRoleType] = useState<'customer' | 'manager' | 'admin'>('customer');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let rpcName = 'authenticate_user';
      if (roleType === 'manager') rpcName = 'authenticate_employee';
      if (roleType === 'admin') rpcName = 'authenticate_admin';

      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        p_username: username,
        p_password: password,
        p_ip: '127.0.0.1'
      });

      if (rpcError) throw rpcError;

      if (data && data.success) {
        if (roleType === 'customer') {
          login({ id: data.customer_id, role: 'customer' });
          navigate('/dashboard');
        } else if (roleType === 'manager') {
          login({ id: data.user_id, role: 'manager', department: data.department, branch_id: data.branch_id });
          navigate('/admin');
        } else if (roleType === 'admin') {
          login({ id: data.user_id, role: 'admin' });
          navigate('/admin');
        }
      } else {
        setError(data?.message || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card fade-in-scale">
      {/* Tab Navigation */}
      <div className="auth-tabs" style={{ marginBottom: '16px' }}>
        <button 
          className={`auth-tab ${roleType === 'customer' ? 'active' : ''}`}
          onClick={() => setRoleType('customer')}
        >Customer</button>
        <button 
          className={`auth-tab ${roleType === 'manager' ? 'active' : ''}`}
          onClick={() => setRoleType('manager')}
        >Manager</button>
        <button 
          className={`auth-tab ${roleType === 'admin' ? 'active' : ''}`}
          onClick={() => setRoleType('admin')}
        >Admin</button>
      </div>

      {roleType === 'customer' && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Create an account</Link> if you don't have one.
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'rgba(var(--accent-primary-rgb), 0.1)',
          border: '1px solid rgba(var(--accent-primary-rgb), 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Shield size={28} color="var(--accent-primary)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>
          {roleType === 'customer' ? 'Sign In' : roleType === 'manager' ? 'Manager Portal' : 'Admin Portal'}
        </h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
          {roleType === 'customer' ? 'Enter credentials to access your account' : 'Authorized personnel only'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          <Shield size={16} />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Username</label>
          <div style={{ position: 'relative' }}>
            <User size={17} style={{ position: 'absolute', top: '14px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input
              id="login-username"
              type="text"
              className="form-control"
              placeholder="e.g. johndoe123"
              style={{ paddingLeft: '42px' }}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={17} style={{ position: 'absolute', top: '14px', left: '14px', color: 'var(--text-tertiary)' }} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="••••••••"
              style={{ paddingLeft: '42px', paddingRight: '42px' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-tertiary)', padding: '2px'
              }}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          className="btn-primary"
          style={{ width: '100%', marginTop: '4px', padding: '14px' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(6,11,24,0.2)', borderTopColor: '#060B18' }} />
              Authenticating...
            </>
          ) : 'Sign In to Dashboard'}
        </button>
      </form>
    </div>
  );
}
