import { useState, useEffect, useRef, useCallback } from 'react';
import { memberApiClient } from '../api/client';
import type { MemberCommunityUpdate } from '../api/validators';

function formatDateTime(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/.exec(val);
  if (!match) return '—';
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

export function MemberCommunityPage() {
  const [items, setItems] = useState<MemberCommunityUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchUpdates = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generation = ++requestGenerationRef.current;

    setLoading(true);
    setError('');

    try {
      const updates = await memberApiClient.getCommunityUpdates(controller.signal);

      if (!isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      setItems(updates);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (!isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }
      setError('Topluluk duyuruları yüklenemedi.');
    } finally {
      if (isMountedRef.current && generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUpdates();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchUpdates]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Topluluk</h1>
        <p className="text-sm text-white/60 mt-1">
          SO3’ten duyurular ve topluluk güncellemeleri.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchUpdates}
            className="min-h-[44px] px-5 py-2.5 bg-[#851C35] hover:bg-[#851C35]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center"
          >
            Tekrar Dene
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((skeletonId) => (
            <div
              key={skeletonId}
              className="rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6 space-y-3 animate-pulse"
            >
              <div className="h-3 w-28 bg-white/10 rounded" />
              <div className="h-5 w-2/3 bg-white/10 rounded" />
              <div className="space-y-2 pt-1">
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-4 w-5/6 bg-white/5 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#121212] p-8 text-center text-white/50 text-sm">
          Henüz yayınlanmış topluluk duyurusu bulunmuyor.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6 hover:border-white/20 transition-colors"
            >
              <div className="mb-2">
                <time className="text-xs text-white/50 font-mono">
                  {formatDateTime(item.published_at)}
                </time>
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {item.title}
              </h2>
              <div className="mt-3 text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words font-normal">
                {item.body}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
