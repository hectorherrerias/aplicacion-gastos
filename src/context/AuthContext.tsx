import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  username: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('gastospro_jwt_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on boot
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('gastospro_jwt_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.auth.me();
        setUser(res.user);
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem('gastospro_jwt_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.auth.login(username, password);
    localStorage.setItem('gastospro_jwt_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, password: string, name?: string) => {
    const data = await api.auth.register(username, password, name);
    localStorage.setItem('gastospro_jwt_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('gastospro_jwt_token');
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    await api.auth.changePassword(currentPass, newPass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
