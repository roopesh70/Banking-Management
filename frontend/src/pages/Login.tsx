import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

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
          login({ id: data.customer_id, role: 'customer', username });
          navigate('/dashboard');
        } else if (roleType === 'manager') {
          login({ id: data.user_id, role: 'manager', username, department: data.department, branch_id: data.branch_id });
          navigate('/admin');
        } else if (roleType === 'admin') {
          login({ id: data.user_id, role: 'admin', username });
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
    <div className="bg-app rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl transition-all duration-200">
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-semibold text-primary tracking-wide uppercase italic">AeroBank</h1>
      </div>
      
      {forgotMode ? (
        <div className="space-y-4 text-center">
          <h2 className="text-[22px] font-semibold text-primary">Reset Password</h2>
          <p className="text-sm text-secondary mb-4">Enter your username or email to receive an OTP</p>
          {resetMsg && <p className="text-sm text-accent-teal mb-4">{resetMsg}</p>}
          <form onSubmit={(e) => { e.preventDefault(); setResetMsg('An OTP has been sent to your registered email address.'); }} className="space-y-4">
            <input
              type="text"
              placeholder="Username or Email"
              className="w-full bg-card rounded-full px-5 py-3 text-[15px] text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all"
              required
            />
            <button
              type="submit"
              className="w-full bg-secondary text-white rounded-full py-3 font-medium text-[15px] hover:bg-[#6c5e6a] transition-colors active:scale-95"
            >
              Send OTP
            </button>
          </form>
          <button onClick={() => { setForgotMode(false); setResetMsg(''); }} className="text-sm text-secondary hover:text-primary transition-colors mt-4">
            Back to Sign In
          </button>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <h2 className="text-[22px] font-semibold text-primary">Sign In</h2>
            <p className="text-sm text-secondary">Enter credentials to access your account</p>
          </div>

      <div className="flex bg-card rounded-2xl p-1 mb-6">
        {(['customer', 'manager', 'admin'] as const).map(role => (
          <button 
            key={role}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors capitalize ${
              roleType === role ? 'bg-elevated shadow-sm text-primary' : 'text-secondary hover:text-primary transition-colors'
            }`}
            onClick={() => setRoleType(role)}
          >
            {role}
          </button>
        ))}
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Username"
            className="w-full bg-card rounded-full px-5 py-3 text-[15px] text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="w-full bg-card rounded-full px-5 py-3 text-[15px] text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-accent-rose text-center">{error}</p>
          )}
        </div>

        <div className="text-right">
          <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-secondary hover:text-primary transition-colors">Forgot Password?</button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-secondary text-white rounded-full py-3 font-medium text-[15px] hover:bg-[#6c5e6a] transition-colors active:scale-95 disabled:opacity-60 mt-4"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      {roleType === 'customer' && (
        <div className="text-center mt-6">
          <Link to="/register" className="text-sm text-secondary hover:text-primary transition-colors">
            Don't have an account? Register
          </Link>
        </div>
      )}
        </>
      )}
    </div>
  );
}
