import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { User } from '../types';
import { disconnectSocket, getSocket } from '../services/socket';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then((res) => {
        setUser(res.data.user);
        // Start socket heartbeat
        const socket = getSocket();
        const heartbeatInterval = setInterval(() => {
          if (socket.connected) socket.emit('heartbeat');
        }, 30000);
        return () => clearInterval(heartbeatInterval);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const res = await authApi.me();
    setUser(res.data.user);
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    disconnectSocket();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, login, logout,
      isAdmin: user?.role === 'admin',
      isSupervisor: user?.role === 'supervisor' || user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
