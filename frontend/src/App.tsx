import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import Beneficiaries from './pages/Beneficiaries';
import Loans from './pages/Loans';
import Accounts from './pages/Accounts';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminLoans from './pages/admin/AdminLoans';
import AdminAudit from './pages/admin/AdminAudit';
import AdminFinancials from './pages/admin/AdminFinancials';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Customer Portal */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/beneficiaries" element={<Beneficiaries />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/accounts" element={<Accounts />} />
        </Route>

        {/* Admin Portal */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/employees" element={<AdminEmployees />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/accounts" element={<AdminAccounts />} />
          <Route path="/admin/loans" element={<AdminLoans />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/financials" element={<AdminFinancials />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
