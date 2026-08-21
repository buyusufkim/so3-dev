import { publicApiFetch } from "../../lib/devFallback";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { SiteSettingsResponse } from './types';

interface ApiEnvelope<T> {
  data: T;
}

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
        const res = await publicApiFetch('/api/public/site-settings');
        if (!res.ok) {
          throw new Error('Failed to fetch settings');
        }
        
        const json: unknown = await res.json();
        
        // Runtime validation
        if (
          json &&
          typeof json === 'object' &&
          'data' in json &&
          json.data &&
          typeof json.data === 'object'
        ) {
          const payload = (json as ApiEnvelope<SiteSettingsResponse>).data;
          
          if (
            'contact' in payload &&
            'location' in payload &&
            'social' in payload &&
            'tour' in payload &&
            'business_hours' in payload
          ) {
            if (mounted) {
              setSettings(payload);
            }
          } else {
            throw new Error('Malformed settings payload');
          }
        } else {
          throw new Error('Malformed response envelope');
        }
      } catch (err) {
        if (mounted) {
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
