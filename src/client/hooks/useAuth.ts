import { useState, useEffect, useCallback } from 'react';
import { auth, User } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUser = useCallback(async () => {
    try {
      const { user } = await auth.me();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (login: string, password: string) => {
    const { user } = await auth.login({ login, password });
    setState({ user, isLoading: false, isAuthenticated: true });
    return user;
  };

  const register = async (email: string, username: string, password: string) => {
    const { user } = await auth.register({ email, username, password });
    setState({ user, isLoading: false, isAuthenticated: true });
    return user;
  };

  const logout = async () => {
    await auth.logout();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  const connectGitHub = () => {
    window.location.href = auth.githubUrl();
  };

  return {
    ...state,
    login,
    register,
    logout,
    connectGitHub,
    refreshUser: fetchUser,
  };
}
