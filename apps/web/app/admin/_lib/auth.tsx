'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { ApiError, clientFetch } from '../../_lib/api';

const TOKEN_KEY = 'wedding_admin_token';

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const writeToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

type Api = <T>(
  path: string,
  init?: { method?: string; body?: unknown },
) => Promise<T>;

interface AuthContextValue {
  ready: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  api: Api;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setToken(readToken());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !token && pathname !== '/admin/login')
      router.replace('/admin/login');
  }, [ready, token, pathname, router]);

  const login = useCallback((t: string) => {
    writeToken(t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
  }, []);

  const api = useCallback<Api>(
    async (path, init = {}) => {
      try {
        return await clientFetch(path, { ...init, token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    },
    [token, logout],
  );

  const value = useMemo(
    () => ({ ready, token, login, logout, api }),
    [ready, token, login, logout, api],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Load data from an admin endpoint; re-runs when `path` changes. */
export function useAdminData<T>(path: string) {
  const { api, token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [api, path, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload };
}
