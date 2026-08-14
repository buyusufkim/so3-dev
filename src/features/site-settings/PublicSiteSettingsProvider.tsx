import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { SiteSettingsResponse } from './types';

interface SiteSettingsContextType {
  settings: SiteSettingsResponse | null;
  loading: boolean;
  error: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: null,
  loading: true,
  error: false,
});

export function PublicSiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchSettings() {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch('/api/public/site-settings');
        if (!res.ok) {
          throw new Error('Failed to fetch settings');
        }
        const data = await res.json();
        if (mounted) {
          setSettings(data as SiteSettingsResponse);
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load public site settings', err);
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, error }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
