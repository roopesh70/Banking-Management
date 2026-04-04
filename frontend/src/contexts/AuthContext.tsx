import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * NFR 3.1 & 3.2 Security: Authentication & Session Management
 * This context manages the authenticated user state, supporting role-based logic 
 * for Customers, Managers, and Admins.
 */

export interface UserData {
  id: string;
  role: 'customer' | 'manager' | 'admin' | 'staff';
  username: string;
  department?: string;
  branch_id?: string;
}

interface AuthContextType {
  user: UserData | null;
  login: (user: UserData) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in sessionStorage on mount
    const savedUser = sessionStorage.getItem('obms_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Basic shape validation
        if (
          parsed &&
          typeof parsed.id === 'string' &&
          ['customer', 'manager', 'admin', 'staff'].includes(parsed.role)
        ) {
          setUser(parsed as UserData);
        } else {
          console.warn('Invalid user data in storage, clearing');
          sessionStorage.removeItem('obms_auth_user');
        }
      } catch (error) {
        console.error('Failed to parse auth user from storage:', error);
        sessionStorage.removeItem('obms_auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: UserData) => {
    setUser(userData);
    sessionStorage.setItem('obms_auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('obms_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Ensure main.tsx wraps the app correctly.');
  }
  return context;
}
