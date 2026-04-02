import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout() {
  const { user } = useAuth();

  if (user) {
    if (user.role === 'customer') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="bg-shell min-h-screen flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
