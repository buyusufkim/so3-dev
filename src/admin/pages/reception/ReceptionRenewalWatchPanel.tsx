import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, ApiError } from "../../api/client";
import {
  ReceptionRenewalTarget,
  ReceptionRenewalState,
  ReceptionRenewalWatchItem,
  ReceptionRenewalWatchResponse
} from "./types";
import { RotateCcw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

export interface ReceptionRenewalWatchPanelProps {
  refreshKey: number;
  mutationBusy: boolean;
  renewingMemberId: number | null;
  onRenew: (member: ReceptionRenewalTarget) => void;
}

type RenewalBucket = 'all' | 'expired' | 'today' | 'upcoming';

function validateRenewalWatchResponse(data: any): ReceptionRenewalWatchResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid renewal watch response');
  if (typeof data.as_of_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.as_of_date)) {
    throw new Error('Invalid as_of_date');
  }
  if (typeof data.window_days !== 'number' || data.window_days < 1 || data.window_days > 90 || !Number.isInteger(data.window_days)) {
    throw new Error('Invalid window_days');
  }
  if (typeof data.bucket !== 'string' || !['all', 'expired', 'today', 'upcoming'].includes(data.bucket)) {
    throw new Error('Invalid bucket');
  }

  const summary = data.summary;
  if (!summary || typeof summary !== 'object') throw new Error('Invalid summary object');
  if (typeof summary.expired !== 'number' || summary.expired < 0 || !Number.isInteger(summary.expired)) {
    throw new Error('Invalid summary.expired');
  }
  if (typeof summary.today !== 'number' || summary.today < 0 || !Number.isInteger(summary.today)) {
    throw new Error('Invalid summary.today');
  }
  if (typeof summary.upcoming !== 'number' || summary.upcoming < 0 || !Number.isInteger(summary.upcoming)) {
    throw new Error('Invalid summary.upcoming');
  }
  if (typeof summary.total !== 'number' || summary.total < 0 || !Number.isInteger(summary.total)) {
    throw new Error('Invalid summary.total');
  }

  const pagination = data.pagination;
  if (!pagination || typeof pagination !== 'object') throw new Error('Invalid pagination object');
  if (typeof pagination.total !== 'number' || pagination.total < 0 || !Number.isInteger(pagination.total)) {
    throw new Error('Invalid pagination.total');
  }
  if (typeof pagination.page !== 'number' || pagination.page < 1 || !Number.isInteger(pagination.page)) {
    throw new Error('Invalid pagination.page');
  }
  if (typeof pagination.per_page !== 'number' || pagination.per_page !== 20 || !Number.isInteger(pagination.per_page)) {
    throw new Error('Invalid pagination.per_page');
  }
  if (typeof pagination.last_page !== 'number' || pagination.last_page < 1 || !Number.isInteger(pagination.last_page)) {
    throw new Error('Invalid pagination.last_page');
  }

  if (!Array.isArray(data.items)) {
    throw new Error('Invalid items array');
  }
  if (data.items.length > pagination.per_page) {
    throw new Error('Items length exceeds per_page');
  }

  const items = data.items.map((item: any): ReceptionRenewalWatchItem => {
    if (!item || typeof item !== 'object') throw new Error('Invalid item object');
    if (typeof item.id !== 'number' || item.id <= 0 || !Number.isInteger(item.id)) throw new Error('Invalid item id');
    if (typeof item.uuid !== 'string' || item.uuid === '') throw new Error('Invalid item uuid');
    if (typeof item.first_name !== 'string') throw new Error('Invalid item first_name');
    if (typeof item.last_name !== 'string') throw new Error('Invalid item last_name');
    if (typeof item.phone !== 'string') throw new Error('Invalid item phone');
    if (item.membership_start_date !== null && (typeof item.membership_start_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.membership_start_date))) {
      throw new Error('Invalid item membership_start_date');
    }
    if (typeof item.membership_end_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.membership_end_date)) {
      throw new Error('Invalid item membership_end_date');
    }
    if (typeof item.renewal_state !== 'string' || !['expired', 'today', 'upcoming'].includes(item.renewal_state)) {
      throw new Error('Invalid item renewal_state');
    }
    if (typeof item.days_until_expiry !== 'number' || !Number.isInteger(item.days_until_expiry)) {
      throw new Error('Invalid item days_until_expiry');
    }

    // State / day sign consistency validation
    if (item.renewal_state === 'expired' && item.days_until_expiry >= 0) {
      throw new Error('State/day mismatch: expired must have days_until_expiry < 0');
    }
    if (item.renewal_state === 'today' && item.days_until_expiry !== 0) {
      throw new Error('State/day mismatch: today must have days_until_expiry === 0');
    }
    if (item.renewal_state === 'upcoming' && item.days_until_expiry <= 0) {
      throw new Error('State/day mismatch: upcoming must have days_until_expiry > 0');
    }

    return {
      id: item.id,
      uuid: item.uuid,
      first_name: item.first_name,
      last_name: item.last_name,
      phone: item.phone,
      membership_start_date: item.membership_start_date,
      membership_end_date: item.membership_end_date,
      renewal_state: item.renewal_state as ReceptionRenewalState,
      days_until_expiry: item.days_until_expiry
    };
  });

  return {
    as_of_date: data.as_of_date,
    window_days: data.window_days,
    bucket: data.bucket,
    summary: {
      expired: summary.expired,
      today: summary.today,
      upcoming: summary.upcoming,
      total: summary.total
    },
    items,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      per_page: pagination.per_page,
      last_page: pagination.last_page
    }
  };
}

function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return '-';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function formatDaysCopy(state: ReceptionRenewalState, days: number): string {
  if (state === 'expired') {
    const pastDays = Math.abs(days);
    return `${pastDays} gün geçti`;
  }
  if (state === 'today') {
    return 'Bugün doluyor';
  }
  return `${days} gün kaldı`;
}

export function ReceptionRenewalWatchPanel({
  refreshKey,
  mutationBusy,
  renewingMemberId,
  onRenew
}: ReceptionRenewalWatchPanelProps) {
  const [bucket, setBucket] = useState<RenewalBucket>('all');
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<ReceptionRenewalWatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchRenewalWatch = useCallback(async (currentBucket: RenewalBucket, currentPage: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        bucket: currentBucket,
        window_days: '14',
        page: String(currentPage),
        per_page: '20'
      });

      const response = await apiClient.get(`/api/reception/renewal-watch?${params.toString()}`, {
        signal: abortController.signal
      });

      if (abortController.signal.aborted || !isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      const validated = validateRenewalWatchResponse(response);
      setData(validated);
    } catch (err: unknown) {
      if (abortController.signal.aborted || !isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      let errMsg = "Üyelik yenileme takibi yüklenemedi.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Handled globally
        } else if (err.status === 403) {
          errMsg = "Bu alan için yetkiniz yok.";
        } else if (err.status === 422) {
          errMsg = "Yenileme takip isteği geçersiz.";
        } else {
          errMsg = "Üyelik yenileme takibi yüklenemedi.";
        }
      }
      setError(errMsg);
    } finally {
      if (isMountedRef.current && generation === requestGenerationRef.current && !abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchRenewalWatch(bucket, page);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [bucket, page, refreshKey, fetchRenewalWatch]);

  const handleBucketChange = (newBucket: RenewalBucket) => {
    if (bucket === newBucket) return;
    setBucket(newBucket);
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1 && !loading) {
      setPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (data && page < data.pagination.last_page && !loading) {
      setPage((p) => p + 1);
    }
  };

  const handleRetry = () => {
    fetchRenewalWatch(bucket, page);
  };

  const windowDays = data?.window_days ?? 14;
  const asOfDateStr = data?.as_of_date ? formatDateOnly(data.as_of_date) : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Üyelik Yenileme Takibi</h2>
          <p className="text-sm text-white/50 mt-0.5">
            Süresi geçen veya önümüzdeki {windowDays} gün içinde bitecek aktif üyeler
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs text-white/40">
          {asOfDateStr && (
            <span>Takip tarihi: {asOfDateStr}</span>
          )}
          <button
            type="button"
            onClick={handleRetry}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white/80 transition-colors disabled:opacity-50"
            aria-label="Yenileme takibini yenile"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Summary Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* All */}
        <button
          type="button"
          aria-pressed={bucket === 'all'}
          onClick={() => handleBucketChange('all')}
          className={`p-3.5 rounded-xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
            bucket === 'all'
              ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="text-xs font-medium text-white/60">Toplam Takip</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white">
              {data ? data.summary.total : '-'}
            </span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
              bucket === 'all' ? 'bg-white/20 text-white' : 'text-white/40'
            }`}>
              Tümü
            </span>
          </div>
        </button>

        {/* Expired */}
        <button
          type="button"
          aria-pressed={bucket === 'expired'}
          onClick={() => handleBucketChange('expired')}
          className={`p-3.5 rounded-xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
            bucket === 'expired'
              ? 'bg-red-500/20 border-red-500/40 ring-1 ring-red-500/30'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="text-xs font-medium text-red-300">Süresi Geçmiş</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-red-400">
              {data ? data.summary.expired : '-'}
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
              Süresi Geçmiş
            </span>
          </div>
        </button>

        {/* Today */}
        <button
          type="button"
          aria-pressed={bucket === 'today'}
          onClick={() => handleBucketChange('today')}
          className={`p-3.5 rounded-xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
            bucket === 'today'
              ? 'bg-amber-500/20 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="text-xs font-medium text-amber-300">Bugün Doluyor</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-400">
              {data ? data.summary.today : '-'}
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              Bugün
            </span>
          </div>
        </button>

        {/* Upcoming */}
        <button
          type="button"
          aria-pressed={bucket === 'upcoming'}
          onClick={() => handleBucketChange('upcoming')}
          className={`p-3.5 rounded-xl border text-left transition-all min-h-[44px] flex flex-col justify-between ${
            bucket === 'upcoming'
              ? 'bg-blue-500/20 border-blue-500/40 ring-1 ring-blue-500/30'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="text-xs font-medium text-blue-300">14 Gün İçinde</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-blue-400">
              {data ? data.summary.upcoming : '-'}
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              Yaklaşıyor
            </span>
          </div>
        </button>
      </div>

      {/* Content Body */}
      {loading && !data ? (
        <div className="p-8 text-center text-white/50 border border-white/5 rounded-xl bg-white/[0.02]">
          Yükleniyor...
        </div>
      ) : error ? (
        <div className="p-6 text-center border border-red-500/20 rounded-xl bg-red-500/5 space-y-3">
          <div className="flex items-center justify-center space-x-2 text-red-400 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 min-h-[44px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-medium text-red-300 transition-colors inline-flex items-center justify-center"
          >
            Tekrar Dene
          </button>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="p-8 text-center text-white/50 border border-white/5 rounded-xl bg-white/[0.02]">
          {bucket === 'all' && 'Takip gerektiren üyelik bulunmuyor.'}
          {bucket === 'expired' && 'Süresi geçmiş aktif üyelik bulunmuyor.'}
          {bucket === 'today' && 'Bugün sona eren aktif üyelik bulunmuyor.'}
          {bucket === 'upcoming' && 'Önümüzdeki 14 gün içinde sona erecek aktif üyelik bulunmuyor.'}
        </div>
      ) : data ? (
        <div className="space-y-3">
          {/* Items List */}
          <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
            {data.items.map((item) => {
              const isThisRenewing = renewingMemberId === item.id;
              const daysCopy = formatDaysCopy(item.renewal_state, item.days_until_expiry);

              let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
              let badgeLabel = 'Yaklaşıyor';
              if (item.renewal_state === 'expired') {
                badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                badgeLabel = 'Süresi Geçmiş';
              } else if (item.renewal_state === 'today') {
                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                badgeLabel = 'Bugün Doluyor';
              }

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-white/5 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">
                        {item.first_name} {item.last_name}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    <div className="text-xs text-white/60 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {item.phone && <span>Telefon: {item.phone}</span>}
                      <span>
                        Mevcut Başlangıç: {formatDateOnly(item.membership_start_date)}
                      </span>
                      <span>
                        Mevcut Bitiş: {formatDateOnly(item.membership_end_date)}
                      </span>
                      <span className={`font-medium ${
                        item.renewal_state === 'expired'
                          ? 'text-red-400'
                          : item.renewal_state === 'today'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}>
                        {daysCopy}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onRenew(item)}
                      disabled={mutationBusy}
                      className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-xs font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 whitespace-nowrap"
                    >
                      {isThisRenewing ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Yenileniyor...</span>
                        </>
                      ) : (
                        <span>Üyeliği Yenile</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {data.pagination.last_page > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-white/50">
                Toplam {data.pagination.total} kayıt
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page <= 1 || loading}
                  className="px-3 py-2 min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white transition-colors disabled:opacity-40 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Önceki</span>
                </button>
                <span className="text-xs text-white/70 px-2 font-medium">
                  Sayfa {data.pagination.page} / {data.pagination.last_page}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= data.pagination.last_page || loading}
                  className="px-3 py-2 min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white transition-colors disabled:opacity-40 flex items-center space-x-1"
                >
                  <span>Sonraki</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
