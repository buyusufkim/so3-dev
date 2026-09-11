import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { memberApiClient } from '../api/client';
import { MemberAuthIdentity } from '../api/validators';

type MemberAuthContextType = {
  identity: MemberAuthIdentity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshIdentity: () => Promise<void>;
  logout: () => Promise<void>;
};

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<MemberAuthIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIdentity = async () => {
    try {
      const me = await memberApiClient.me();
      setIdentity(me);
    } catch (err) {
      setIdentity(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await fetchIdentity();
      setIsLoading(false);
    };
    initAuth();

    const handleAuthExpired = () => {
      setIdentity(null);
    };

    window.addEventListener('so3_member_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('so3_member_auth_expired', handleAuthExpired);
    };
  }, []);

  const refreshIdentity = async () => {
    await fetchIdentity();
  };

  const logout = async () => {
    try {
      await memberApiClient.logout();
    } catch (e) {
      // Ignore errors on logout
    }
    setIdentity(null);
  };

  return (
    <MemberAuthContext.Provider
      value={{
        identity,
        isLoading,
        isAuthenticated: !!identity,
        refreshIdentity,
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
