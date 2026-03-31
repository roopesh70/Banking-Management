import React, { createContext, useContext, useState } from 'react';

export type AuthUser = {
  id: string;
  role: 'customer' | 'manager' | 'admin';
  department?: string;
  branch_id?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('s_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem('s_auth_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('s_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
