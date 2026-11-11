import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load existing session from localStorage on application load
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('facemark_token');
      const savedUser = localStorage.getItem('facemark_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error('Failed to parse saved user authentication state', err);
      localStorage.removeItem('facemark_token');
      localStorage.removeItem('facemark_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { access_token, user_id, user_role, user_name, user_email, institution_name } = response.data;

    const userData = {
      id: user_id,
      email: user_email,
      name: user_name,
      role: user_role,
      institution_name: institution_name || '',
    };

    localStorage.setItem('facemark_token', access_token);
    localStorage.setItem('facemark_user', JSON.stringify(userData));

    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (registerData) => {
    const response = await apiClient.post('/auth/register', registerData);
    const { access_token, user_id, user_role, user_name, user_email, institution_name } = response.data;

    const userData = {
      id: user_id,
      email: user_email,
      name: user_name,
      role: user_role,
      institution_name: institution_name || '',
    };

    localStorage.setItem('facemark_token', access_token);
    localStorage.setItem('facemark_user', JSON.stringify(userData));

    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('facemark_token');
    localStorage.removeItem('facemark_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
