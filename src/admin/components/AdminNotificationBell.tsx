import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw, X, Check, ArrowRight, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client';

export type NotificationView = 'active' | 'unread' | 'dismissed';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AdminNotificationItem {
  id: number;
  uuid: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: number | null;
  action_path: string | null;
  is_read: boolean;
  read_at: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

export interface AdminNotificationPagination {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export interface AdminNotificationListResponse {
  unread_count: number;
  view: NotificationView;
  items: AdminNotificationItem[];
  pagination: AdminNotificationPagination;
}

function formatNotificationDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${day}.${month}.${year} ${hour}:${minute}`;
  }
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${day}.${month}.${year}`;
  }
  return dateStr;
}

function validateNotificationItem(data: unknown): AdminNotificationItem | null {
  if (!data || typeof data !== 'object') return null;
  const item = data as Record<string, unknown>;

  if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id <= 0) return null;
  if (typeof item.uuid !== 'string' || item.uuid.trim() === '') return null;
  if (typeof item.type !== 'string' || item.type.trim() === '') return null;
  if (item.severity !== 'info' && item.severity !== 'warning' && item.severity !== 'critical') return null;
  if (typeof item.title !== 'string') return null;
  if (typeof item.body !== 'string') return null;

  if (item.entity_type !== null && typeof item.entity_type !== 'string') return null;
  if (item.entity_id !== null && (typeof item.entity_id !== 'number' || !Number.isInteger(item.entity_id) || item.entity_id <= 0)) return null;

  if (item.action_path !== null) {
    if (typeof item.action_path !== 'string') return null;
    const path = item.action_path.trim();
    if (!path.startsWith('/admin')) return null;
    if (path.includes('://') || path.startsWith('//') || path.toLowerCase().startsWith('javascript:')) return null;
  }

  if (typeof item.is_read !== 'boolean') return null;
  if (item.read_at !== null && typeof item.read_at !== 'string') return null;
  if (item.is_read !== (item.read_at !== null)) return null;

  if (typeof item.is_dismissed !== 'boolean') return null;
  if (item.dismissed_at !== null && typeof item.dismissed_at !== 'string') return null;
  if (item.is_dismissed !== (item.dismissed_at !== null)) return null;

  if (typeof item.created_at !== 'string' || item.created_at.trim() === '') return null;

  return {
    id: item.id,
    uuid: item.uuid,
    type: item.type,
    severity: item.severity as NotificationSeverity,
    title: item.title,
    body: item.body,
    entity_type: item.entity_type as string | null,
    entity_id: item.entity_id as number | null,
    action_path: item.action_path as string | null,
    is_read: item.is_read,
    read_at: item.read_at as string | null,
    is_dismissed: item.is_dismissed,
    dismissed_at: item.dismissed_at as string | null,
    created_at: item.created_at,
  };
}

function validateNotificationListResponse(data: unknown, expectedView: NotificationView, expectedPage: number): AdminNotificationListResponse | null {
  if (!data || typeof data !== 'object') return null;
  const res = data as Record<string, unknown>;

  if (typeof res.unread_count !== 'number' || !Number.isInteger(res.unread_count) || res.unread_count < 0) return null;
  if (res.view !== expectedView) return null;

  if (!res.pagination || typeof res.pagination !== 'object') return null;
  const pag = res.pagination as Record<string, unknown>;
  if (typeof pag.total !== 'number' || !Number.isInteger(pag.total) || pag.total < 0) return null;
  if (typeof pag.page !== 'number' || !Number.isInteger(pag.page) || pag.page < 1 || pag.page !== expectedPage) return null;
  if (pag.per_page !== 10) return null;
  if (typeof pag.last_page !== 'number' || !Number.isInteger(pag.last_page) || pag.last_page < 1) return null;

  if (!Array.isArray(res.items)) return null;
  if (res.items.length > 10) return null;

  const validItems: AdminNotificationItem[] = [];
  for (const rawItem of res.items) {
    const valid = validateNotificationItem(rawItem);
    if (!valid) return null;
    validItems.push(valid);
  }

  return {
    unread_count: res.unread_count,
    view: res.view as NotificationView,
    items: validItems,
    pagination: {
      total: pag.total,
      page: pag.page,
      per_page: pag.per_page,
      last_page: pag.last_page,
    }
  };
}

function validateMutationResponse(data: unknown): AdminNotificationItem | null {
  if (!data || typeof data !== 'object') return null;
  const res = data as Record<string, unknown>;
  if (!res.notification) return null;
  return validateNotificationItem(res.notification);
}

export function AdminNotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [view, setView] = useState<NotificationView>('active');
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [pagination, setPagination] = useState<AdminNotificationPagination | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [materializerWarning, setMaterializerWarning] = useState<string | null>(null);
  const [activeMutationId, setActiveMutationId] = useState<number | 'all' | null>(null);

  const requestGenRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const fetchInbox = useCallback(async (targetView: NotificationView, targetPage: number) => {
    const currentGen = ++requestGenRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get(
        `/api/admin/notifications?view=${targetView}&page=${targetPage}&per_page=10`,
        { signal: controller.signal }
      );

      if (currentGen !== requestGenRef.current) return;

      const validated = validateNotificationListResponse(data, targetView, targetPage);
      if (!validated) {
        setError('Bildirimler yüklenemedi.');
        setItems([]);
        return;
      }

      setUnreadCount(validated.unread_count);
      setView(validated.view);
      setPage(validated.pagination.page);
      setItems(validated.items);
      setPagination(validated.pagination);

      // Bounded correction if current page is empty and beyond last_page
      if (validated.items.length === 0 && targetPage > validated.pagination.last_page && validated.pagination.last_page >= 1) {
        fetchInbox(targetView, validated.pagination.last_page);
      }
    } catch (err: unknown) {
      if (currentGen !== requestGenRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError('Bildirimler yüklenemedi.');
      setItems([]);
    } finally {
      if (currentGen === requestGenRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const materializeAndFetch = useCallback(async (targetView: NotificationView, targetPage: number) => {
    setMaterializerWarning(null);
    try {
      await apiClient.post('/api/reception/renewal-notifications/materialize', {});
    } catch (err: unknown) {
      setMaterializerWarning('Yeni yenileme bildirimleri kontrol edilemedi.');
    } finally {
      await fetchInbox(targetView, targetPage);
    }
  }, [fetchInbox]);

  // Initial mount: materialize renewal notifications then fetch inbox
  useEffect(() => {
    materializeAndFetch('active', 1);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [materializeAndFetch]);

  // Outside click & Escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleTabChange = (newView: NotificationView) => {
    if (newView === view && page === 1) return;
    setView(newView);
    setPage(1);
    fetchInbox(newView, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1) return;
    if (pagination && newPage > pagination.last_page) return;
    setPage(newPage);
    fetchInbox(view, newPage);
  };

  const handleManualRefresh = async () => {
    if (activeMutationId !== null) return;
    setActiveMutationId('all');
    try {
      await materializeAndFetch(view, page);
    } finally {
      setActiveMutationId(null);
    }
  };

  const handleMarkRead = async (id: number) => {
    if (activeMutationId !== null) return;
    setActiveMutationId(id);
    try {
      const res = await apiClient.patch(`/api/admin/notifications/${id}/read`, {});
      validateMutationResponse(res);
    } catch (err: unknown) {
      // Reconcile anyway
    } finally {
      await fetchInbox(view, page);
      setActiveMutationId(null);
    }
  };

  const handleDismiss = async (id: number) => {
    if (activeMutationId !== null) return;
    setActiveMutationId(id);
    try {
      const res = await apiClient.patch(`/api/admin/notifications/${id}/dismiss`, {});
      validateMutationResponse(res);
    } catch (err: unknown) {
      // Reconcile anyway
    } finally {
      await fetchInbox(view, page);
      setActiveMutationId(null);
    }
  };

  const handleOpenAction = async (item: AdminNotificationItem) => {
    if (!item.action_path) return;

    if (item.is_read) {
      navigate(item.action_path);
      setIsOpen(false);
      return;
    }

    if (activeMutationId !== null) return;
    setActiveMutationId(item.id);

    try {
      const res = await apiClient.patch(`/api/admin/notifications/${item.id}/read`, {});
      const valid = validateMutationResponse(res);
      if (valid) {
        navigate(item.action_path);
        setIsOpen(false);
        fetchInbox(view, page);
      } else {
        await fetchInbox(view, page);
      }
    } catch (err: unknown) {
      await fetchInbox(view, page);
    } finally {
      setActiveMutationId(null);
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Kritik
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Uyarı
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Info className="w-3 h-3 text-sky-400" />
            Bilgi
          </span>
        );
    }
  };

  const accessibleBellLabel = unreadCount !== null && unreadCount > 0
    ? `Bildirimler, ${unreadCount} okunmamış`
    : 'Bildirimler';

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={accessibleBellLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#851C35]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount !== null && unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[#851C35] rounded-full border border-white/20">
            {unreadCount >= 100 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Bildirimler"
          className="absolute right-0 mt-2 w-[min(380px,calc(100vw-2rem))] max-h-[min(70dvh,620px)] flex flex-col bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#171717]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Bildirimler</h2>
              {unreadCount !== null && unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#851C35]/30 text-rose-300 border border-[#851C35]/50 rounded">
                  {unreadCount} okunmamış
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={activeMutationId !== null || loading}
                aria-label="Bildirimleri yenile"
                className="flex items-center justify-center min-h-[40px] min-w-[40px] rounded text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${activeMutationId === 'all' || loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Kapat"
                className="flex items-center justify-center min-h-[40px] min-w-[40px] rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Materializer Warning */}
          {materializerWarning && (
            <div className="px-4 py-2 text-xs bg-amber-500/10 border-b border-amber-500/20 text-amber-300">
              {materializerWarning}
            </div>
          )}

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Bildirim görünümü"
            className="flex border-b border-white/10 bg-[#141414] px-2 pt-2 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'active'}
              onClick={() => handleTabChange('active')}
              className={`flex-1 min-h-[40px] text-xs font-medium rounded-t transition-colors border-b-2 ${
                view === 'active'
                  ? 'border-[#851C35] text-white bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'unread'}
              onClick={() => handleTabChange('unread')}
              className={`flex-1 min-h-[40px] text-xs font-medium rounded-t transition-colors border-b-2 ${
                view === 'unread'
                  ? 'border-[#851C35] text-white bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              Okunmamış
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'dismissed'}
              onClick={() => handleTabChange('dismissed')}
              className={`flex-1 min-h-[40px] text-xs font-medium rounded-t transition-colors border-b-2 ${
                view === 'dismissed'
                  ? 'border-[#851C35] text-white bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              Kapatılanlar
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-white/5">
            {loading && items.length === 0 && (
              <div className="py-12 text-center text-xs text-white/50">
                Bildirimler yükleniyor...
              </div>
            )}

            {!loading && error && (
              <div className="py-8 text-center space-y-3">
                <div className="text-xs text-rose-400">{error}</div>
                <button
                  type="button"
                  onClick={() => fetchInbox(view, page)}
                  className="px-4 py-2 min-h-[40px] text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="py-12 text-center text-xs text-white/40">
                {view === 'active' && 'Aktif bildiriminiz yok.'}
                {view === 'unread' && 'Okunmamış bildiriminiz yok.'}
                {view === 'dismissed' && 'Kapatılmış bildiriminiz yok.'}
              </div>
            )}

            {items.map((item) => {
              const isItemBusy = activeMutationId === item.id || activeMutationId === 'all';
              return (
                <div
                  key={item.id}
                  className={`pt-2 first:pt-0 pb-2 rounded-lg p-2.5 transition-colors ${
                    !item.is_read
                      ? 'bg-white/[0.04] border border-white/10'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getSeverityBadge(item.severity)}
                      {!item.is_read && (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          Okunmamış
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/40">
                      {formatNotificationDate(item.created_at)}
                    </span>
                  </div>

                  {/* Title & Body */}
                  <div className={`text-xs text-white mb-1 ${!item.is_read ? 'font-semibold' : 'font-medium'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-white/70 leading-relaxed mb-2.5">
                    {item.body}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/5">
                    {item.action_path && (
                      <button
                        type="button"
                        onClick={() => handleOpenAction(item)}
                        disabled={isItemBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[40px] text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded transition-colors disabled:opacity-40"
                      >
                        Aç
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        disabled={isItemBusy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[40px] text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-40"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        Okundu
                      </button>
                    )}

                    {!item.is_dismissed && (
                      <button
                        type="button"
                        onClick={() => handleDismiss(item.id)}
                        disabled={isItemBusy}
                        className="inline-flex items-center gap-1 px-2 py-1 min-h-[40px] text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-40"
                      >
                        <X className="w-3 h-3" />
                        Kapat
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {pagination && pagination.last_page > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-white/10 bg-[#171717] text-xs">
              <span className="text-white/50">
                Sayfa {pagination.page} / {pagination.last_page}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading || activeMutationId !== null}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-1 min-h-[40px] font-medium border border-white/10 rounded text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.last_page || loading || activeMutationId !== null}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-3 py-1 min-h-[40px] font-medium border border-white/10 rounded text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
