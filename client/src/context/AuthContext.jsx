import { createContext, useCallback, useEffect, useState } from 'react';
import { setAccessToken } from '../api/tokenStore';
import { loginRequest, logoutRequest, meRequest, refreshRequest, registerRequest } from '../api/auth.api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshRequest()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
        return meRequest();
      })
      .then(({ user }) => setUser(user))
      .catch(() => setAccessToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { user, accessToken } = await loginRequest(credentials);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { user, accessToken } = await registerRequest(payload);
    setAccessToken(accessToken);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  // Lets a mutation that returns the updated user (e.g. PATCH /users/me) keep this context in
  // sync without a full page reload.
  const updateUser = useCallback((updated) => setUser(updated), []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
