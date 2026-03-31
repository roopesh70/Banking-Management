import { Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, UserCog, ArrowLeftRight, CreditCard,
  FileText, ScrollText, DollarSign, LogOut, ArrowLeft, Shield
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => { logout(); navigate('/login'); };

  const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Customers', icon: Users, path: '/admin/customers' },
    { name: 'Employees', icon: UserCog, path: '/admin/employees' },
    { name: 'Accounts', icon: CreditCard, path: '/admin/accounts' },
    { name: 'Transactions', icon: ArrowLeftRight, path: '/admin/transactions' },
    { name: 'Loans', icon: FileText, path: '/admin/loans' },
    { name: 'Audit Logs', icon: ScrollText, path: '/admin/audit', adminOnly: true },
    { name: 'Financials', icon: DollarSign, path: '/admin/financials', adminOnly: true },
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || user.role === 'admin');

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ padding: '0 8px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-secondary), var(--danger))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 800, color: '#fff'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2 }}>AeroBank</h2>
              <p style={{ color: 'var(--accent-secondary)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.role === 'admin' ? 'Admin Panel' : 'Manager Panel'}
              </p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="sidebar-section-label">Management</span>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link to={item.path} key={item.name} className={`nav-item ${isActive ? 'active' : ''}`}>
                <item.icon size={19} />
                {item.name}
              </Link>
            );
          })}

          {user.role === 'admin' && (
            <>
              <span className="sidebar-section-label">Portal</span>
              <Link to="/dashboard" className="nav-item">
                <ArrowLeft size={19} />
                Customer View
              </Link>
            </>
          )}
        </nav>

        <button onClick={handleLogout} className="btn-secondary sidebar-logout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
          <LogOut size={17} /> Sign Out
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
