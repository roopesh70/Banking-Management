import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout() {
  const { customerId } = useAuth();

  if (customerId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-background">
      {/* Decorative grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.015, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '20px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: '#060B18', fontFamily: 'var(--font-sans)'
            }}>A</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              AeroBank
            </h1>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>Premium Digital Banking Platform</p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
