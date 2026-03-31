import React, { createContext, useContext, useState } from 'react';

// For simplicity in this DBMS project, we'll store customer_id in state after our custom RPC login
type AuthContextType = {
  customerId: string | null;
  login: (id: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  customerId: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [customerId, setCustomerId] = useState<string | null>(() => {
    return localStorage.getItem('s_auth_id');
  });

  const login = (id: string) => {
    setCustomerId(id);
    localStorage.setItem('s_auth_id', id);
  };

  const logout = () => {
    setCustomerId(null);
    localStorage.removeItem('s_auth_id');
  };

  return (
    <AuthContext.Provider value={{ customerId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
