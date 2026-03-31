import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Phone, Calendar, CreditCard, Lock, Eye, EyeOff, MapPin, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    dob: '',
    gender: '',
    govId: '',
    address: '',
    username: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Password strength (REQ-4A: min 8 chars, 1 uppercase, 1 digit, 1 special char)
  const passwordStrength = useMemo(() => {
    const p = formData.password;
    if (!p) return { score: 0, label: '', color: '' };

    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'var(--danger)' };
    if (score === 2) return { score, label: 'Fair', color: 'var(--warning)' };
    if (score === 3) return { score, label: 'Good', color: 'var(--accent-amber)' };
    return { score, label: 'Strong', color: 'var(--success)' };
  }, [formData.password]);

  const passwordValid = passwordStrength.score === 4;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setError('Password must be at least 8 characters with 1 uppercase letter, 1 digit, and 1 special character.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('register_customer', {
        p_name: formData.name,
        p_email: formData.email,
        p_contact: formData.contact,
        p_dob: formData.dob,
        p_gov_id: formData.govId,
        p_address: formData.address,
        p_username: formData.username,
        p_password: formData.password,
        p_gender: formData.gender || null,
      });

      if (rpcError) throw rpcError;

      if (data) {
        login(data);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed.';
      if (msg.includes('duplicate key') && msg.includes('email')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('duplicate key') && msg.includes('username')) {
        setError('This username is already taken. Please choose another.');
      } else if (msg.includes('duplicate key') && msg.includes('contact_number')) {
        setError('This phone number is already registered.');
      } else if (msg.includes('duplicate key') && msg.includes('government_id')) {
        setError('This Government ID is already registered.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputIcon = (Icon: any) => (
    <Icon size={17} style={{ position: 'absolute', top: '14px', left: '14px', color: 'var(--text-tertiary)' }} />
  );

  return (
    <div className="auth-card fade-in-scale" style={{ maxWidth: '520px' }}>
      {/* Tab Navigation */}
      <div className="auth-tabs">
        <Link to="/login" style={{ textDecoration: 'none', flex: 1 }}>
          <button className="auth-tab" style={{ width: '100%' }}>Sign In</button>
        </Link>
        <button className="auth-tab active">Create Account</button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'rgba(var(--accent-secondary-rgb), 0.1)',
          border: '1px solid rgba(var(--accent-secondary-rgb), 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <UserPlus size={28} color="var(--accent-secondary)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Create Your Account</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          Register with your email to start banking digitally
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger">
          <CreditCard size={16} />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleRegister}>
        {/* Name + Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Full Name</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(User)}
              <input type="text" className="form-control" placeholder="Johan Andrews" style={{ paddingLeft: '42px' }} value={formData.name} onChange={update('name')} required />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Mail)}
              <input type="email" className="form-control" placeholder="you@example.com" style={{ paddingLeft: '42px' }} value={formData.email} onChange={update('email')} required />
            </div>
          </div>
        </div>

        {/* Phone + DOB */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Phone Number</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Phone)}
              <input type="tel" className="form-control" placeholder="+91 98765 43210" style={{ paddingLeft: '42px' }} value={formData.contact} onChange={update('contact')} required />
            </div>
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Calendar)}
              <input type="date" className="form-control" style={{ paddingLeft: '42px' }} value={formData.dob} onChange={update('dob')} required />
            </div>
          </div>
        </div>

        {/* Gender + Gov ID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Gender</label>
            <select className="form-control" value={formData.gender} onChange={update('gender')}>
              <option value="">- Select -</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Government ID (Aadhaar/PAN)</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(CreditCard)}
              <input type="text" className="form-control" placeholder="XXXX-XXXX-XXXX" style={{ paddingLeft: '42px' }} value={formData.govId} onChange={update('govId')} required />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="form-group">
          <label>Residential Address</label>
          <div style={{ position: 'relative' }}>
            {inputIcon(MapPin)}
            <input type="text" className="form-control" placeholder="Full address including city and state" style={{ paddingLeft: '42px' }} value={formData.address} onChange={update('address')} required />
          </div>
        </div>

        <div className="divider" />

        {/* Username + Password */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Choose Username</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(User)}
              <input type="text" className="form-control" placeholder="johndoe123" style={{ paddingLeft: '42px' }} value={formData.username} onChange={update('username')} required autoComplete="username" />
            </div>
          </div>
          <div className="form-group">
            <label>Create Password</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Lock)}
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                style={{ paddingLeft: '42px', paddingRight: '42px' }}
                value={formData.password}
                onChange={update('password')}
                required
                autoComplete="new-password"
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
        </div>

        {/* Password Strength */}
        {formData.password && (
          <div className="password-strength" style={{ marginTop: '-8px', marginBottom: '16px' }}>
            <div className="password-strength-bar">
              <div
                className="password-strength-fill"
                style={{
                  width: `${(passwordStrength.score / 4) * 100}%`,
                  background: passwordStrength.color
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="password-strength-text" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                <span style={{ color: formData.password.length >= 8 ? 'var(--success)' : undefined }}>
                  {formData.password.length >= 8 && <CheckCircle2 size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />}
                  8+ chars
                </span>
                <span style={{ color: /[A-Z]/.test(formData.password) ? 'var(--success)' : undefined }}>
                  {/[A-Z]/.test(formData.password) && <CheckCircle2 size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />}
                  A-Z
                </span>
                <span style={{ color: /[0-9]/.test(formData.password) ? 'var(--success)' : undefined }}>
                  {/[0-9]/.test(formData.password) && <CheckCircle2 size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />}
                  0-9
                </span>
                <span style={{ color: /[^A-Za-z0-9]/.test(formData.password) ? 'var(--success)' : undefined }}>
                  {/[^A-Za-z0-9]/.test(formData.password) && <CheckCircle2 size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />}
                  !@#
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          id="register-submit"
          type="submit"
          className="btn-primary"
          style={{ width: '100%', padding: '14px' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(6,11,24,0.2)', borderTopColor: '#060B18' }} />
              Creating Account...
            </>
          ) : 'Create Account & Start Banking'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
