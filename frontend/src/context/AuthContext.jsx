import { createContext, useContext, useState } from 'react';
import { removeFCMToken } from '../services/notificationService';

const AuthContext = createContext();

// Helper: safely read user from localStorage
// Returns null if token is missing or data is corrupted
const getStoredUser = () => {
  try {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (!token || !user) return null;
    return JSON.parse(user);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const updateUser = (userData) => {
    // Only update if we already have a user
    if (user) {
      const updated = { ...user, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  const logout = () => {
    const fcmToken = localStorage.getItem('fcm_token');
    if (fcmToken) {
      removeFCMToken(fcmToken).catch(() => {});
    }
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_device_id');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
