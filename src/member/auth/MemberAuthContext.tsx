import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { memberApiClient, MemberApiError } from '../api/client';
import { MemberAuthIdentity } from '../api/validators';

type MemberAuthContextType = {
  identity: MemberAuthIdentity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  refreshIdentity: () => Promise<MemberAuthIdentity | null>;
  retryAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<MemberAuthIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchIdentity = async (signal?: AbortSignal): Promise<MemberAuthIdentity | null> => {
    try {
      const me = await memberApiClient.me(signal);
      setIdentity(me);
      setAuthError(null);
      return me;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      setIdentity(null);
      if (err instanceof MemberApiError && err.status === 401) {
        setAuthError(null); // Valid unauthenticated state
      } else {
        const msg = err instanceof Error ? err.message : 'Bağlantı hatası.';
        setAuthError(msg);
      }
      return null;
    }
  };

  const initAuth = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    await fetchIdentity(abortControllerRef.current.signal);
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
    const handleAuthExpired = () => {
      setIdentity(null);
      setAuthError(null);
    };
    window.addEventListener('so3_member_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('so3_member_auth_expired', handleAuthExpired);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refreshIdentity = async () => {
    return await fetchIdentity();
  };

  const retryAuth = async () => {
    await initAuth();
  };

  const logout = async () => {
    try {
      await memberApiClient.logout();
    } catch (e) {
      // Ignore errors on logout
    }
    setIdentity(null);
    setAuthError(null);
  };

  return (
    <MemberAuthContext.Provider
      value={{
        identity,
        isLoading,
        isAuthenticated: !!identity,
        authError,
        refreshIdentity,
        retryAuth,
        logout
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (context === undefined) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return context;
}
