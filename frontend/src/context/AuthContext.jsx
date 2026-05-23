import { useState, useEffect } from 'react';
import API from '../api/axios';
import AuthContext from './authStore';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (token) {
      API.get('/auth/me')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await API.post('/auth/register', { username, email, password });
    return res.data;
  };

  const verifyOTP = async (email, otp) => {
    const res = await API.post('/auth/verify-otp', { email, otp });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return res.data;
  };

  const resendOTP = async (email) => {
    const res = await API.post('/auth/resend-otp', { email });
    return res.data;
  };

  const updateProfile = async (username) => {
    const res = await API.put('/auth/profile', { username });
    const nextUser = res.data.user;
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    return res.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await API.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyOTP, resendOTP, updateProfile, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
