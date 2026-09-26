import { apiClient } from './client';

// POST /register
export const register = (data) =>
  apiClient('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// POST /login
export const login = (data) =>
  apiClient('/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// POST /logout
export const logout = () =>
  apiClient('/logout', { method: 'POST' });
