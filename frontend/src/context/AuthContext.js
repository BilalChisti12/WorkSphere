import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMyProfile } from '../lib/api/users';
import { logout as logoutApi } from '../lib/api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive Slack connection status from backend populated field
  const slackConnected = !!currentUser?.userId?.slackUserId;

  const isAuthenticated = !!token && !!currentUser;

  // Fetch profile and hydrate state
  const refreshCurrentUser = useCallback(async () => {
    try {
      const profile = await getMyProfile();
      setCurrentUser(profile);
    } catch (err) {
      if (err.status === 401) {
        // Token invalid - clear everything
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
      }
    }
  }, []);

  // Called after successful login
  const login = useCallback(async (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const profile = await getMyProfile();
      setCurrentUser(profile);
    } catch {
      localStorage.removeItem('token');
      setToken(null);
    }
  }, []);

  // Called on logout
  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Even if API fails, clear local state
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setCurrentUser(null);
    }
  }, []);

  // On app load: check for existing token
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    getMyProfile()
      .then((profile) => {
        setCurrentUser(profile);
      })
      .catch((err) => {
        if (err.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const value = {
    token,
    currentUser,
    isLoading,
    isAuthenticated,
    slackConnected,
    login,
    logout,
    refreshCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
