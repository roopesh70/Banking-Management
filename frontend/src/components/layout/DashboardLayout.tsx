import { Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Send, Users, LogOut, FileText, CreditCard, Shield } from 'lucide-react';

export default function DashboardLayout() {
  const { customerId, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!customerId) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Accounts', icon: CreditCard, path: '/accounts' },
    { name: 'Transfers', icon: Send, path: '/transfer' },
    { name: 'Beneficiaries', icon: Users, path: '/beneficiaries' },
    { name: 'Loans', icon: FileText, path: '/loans' },
  ];

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand" style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 800, color: '#060B18'
            }}>A</div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2 }}>AeroBank</h2>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem', fontWeight: 500 }}>Customer Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="sidebar-section-label">Banking</span>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                to={item.path}
                key={item.name}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={19} />
                {item.name}
              </Link>
            );
          })}

          <span className="sidebar-section-label">Administration</span>
          <Link to="/admin" className={`nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
            <Shield size={19} />
            Admin Panel
          </Link>
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="btn-secondary sidebar-logout"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
