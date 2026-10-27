import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints.js';
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // restaurando sesión con la cookie de refresh

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    // refreshSession comparte la promesa en vuelo, así StrictMode no rota el token dos veces
    refreshSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const { accessToken, user } = await authApi.login(credentials);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(
    async (data) => {
      const { name, email, password } = data;
      await authApi.register({ name, email, password });
      return login({ email, password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
