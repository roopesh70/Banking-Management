import { Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Send, Users, LogOut, FileText, CreditCard } from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || user.role !== 'customer') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Accounts', icon: CreditCard, path: '/accounts' },
    { name: 'Transfers', icon: Send, path: '/transfer' },
    { name: 'Beneficiaries', icon: Users, path: '/beneficiaries' },
    { name: 'Loans', icon: FileText, path: '/loans' },
  ];

  return (
    <div className="bg-shell min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="bg-app rounded-[40px] w-full max-w-[1200px] min-h-[85vh] flex overflow-hidden shadow-2xl transition-all duration-300 relative">
        {/* Sidebar */}
        <aside className="w-[240px] p-8 shrink-0 flex flex-col border-r border-[#e6dce3]/50 hidden md:flex">
          {/* Brand */}
          <div className="mb-10 px-2">
            <h1 className="text-[28px] font-semibold text-primary tracking-wide uppercase">AeroBank</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-2">
            {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  to={item.path}
                  key={item.name}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                    isActive 
                      ? 'bg-elevated text-primary shadow-sm font-medium' 
                      : 'text-secondary hover:text-primary hover:bg-[#e6dce3]/50'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="text-[15px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-secondary hover:text-accent-rose hover:bg-accent-rose/10 transition-colors mt-auto text-left"
          >
            <LogOut size={20} />
            <span className="text-[15px] font-medium">Log Out</span>
          </button>
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-app border-t border-card/60 flex justify-around p-3 z-40">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link to={item.path} key={item.name} className={`p-2 rounded-xl flex flex-col items-center gap-1 flex-1 ${isActive ? 'text-primary bg-elevated shadow-sm' : 'text-secondary'}`}>
                <item.icon size={20} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full pb-24 md:pb-10 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
