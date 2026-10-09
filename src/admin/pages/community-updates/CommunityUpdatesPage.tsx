import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCcw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/client';
import {
  CommunityUpdateListItem,
  CommunityUpdateListResponse,
  CommunityUpdateStatus,
  validateCommunityUpdateListResponse
} from './types';
import { CommunityUpdateEditorModal } from './CommunityUpdateEditorModal';

/**
 * Formats canonical `YYYY-MM-DD HH:mm:ss` into `DD.MM.YYYY HH:mm`.
 * Pure string parsing; fails closed to "—" if missing or invalid.
 */
function formatDateTime(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/.exec(val);
  if (!match) return '—';
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

type FilterOption = 'all' | 'draft' | 'published';

export function CommunityUpdatesPage() {
  const [items, setItems] = useState<CommunityUpdateListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Soft-delete confirmation modal
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Race safety guards
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
      const url = `/api/admin/community-updates?status=${statusFilter}&page=${page}&per_page=20`;
      const response: unknown = await apiClient.get(url, {
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        generation !== requestGenerationRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      const validated: CommunityUpdateListResponse = validateCommunityUpdateListResponse(response);
      setItems(validated.items);
      setPage(validated.meta.page);
      setLastPage(validated.meta.last_page);
      setTotal(validated.meta.total);
    } catch {
      if (
        controller.signal.aborted ||
        generation !== requestGenerationRef.current ||
        !isMountedRef.current
      ) {
        return;
      }
      setError('Topluluk duyuruları yüklenemedi.');
    } finally {
      if (
        !controller.signal.aborted &&
        generation === requestGenerationRef.current &&
        isMountedRef.current
      ) {
        setLoading(false);
      }
    }
  }, [statusFilter, page]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUpdates();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchUpdates]);

  const handleFilterChange = (newFilter: FilterOption) => {
    if (newFilter === statusFilter) return;
    setStatusFilter(newFilter);
    setPage(1);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
  };

  const handleEditorSuccess = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    fetchUpdates();
  };

  const handleConfirmDelete = async () => {
    if (!deletingId || isDeleting) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      await apiClient.delete(`/api/admin/community-updates/${deletingId}`);
      setDeletingId(null);

      // If last item on page > 1 was deleted, go to previous page
      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchUpdates();
      }
    } catch {
      setDeleteError('Duyuru silinemedi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getEmptyStateMessage = () => {
    if (statusFilter === 'draft') return 'Taslak duyuru bulunmuyor.';
    if (statusFilter === 'published') return 'Yayında duyuru bulunmuyor.';
    return 'Henüz topluluk duyurusu bulunmuyor.';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Topluluk Duyuruları</h1>
          <p className="text-xs text-white/50 mt-1">
            Üye portalında yayımlanacak kulüp duyurularını ve güncellemelerini yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="min-h-[44px] px-4 py-2.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition inline-flex items-center justify-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Duyuru
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => handleFilterChange('all')}
          className={`min-h-[44px] px-4 py-2 text-xs font-medium rounded-lg transition ${
            statusFilter === 'all'
              ? 'bg-white text-black font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Tümü
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('draft')}
          className={`min-h-[44px] px-4 py-2 text-xs font-medium rounded-lg transition ${
            statusFilter === 'draft'
              ? 'bg-white text-black font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Taslak
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('published')}
          className={`min-h-[44px] px-4 py-2 text-xs font-medium rounded-lg transition ${
            statusFilter === 'published'
              ? 'bg-white text-black font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Yayında
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-[#121212] border border-white/10 rounded-xl p-8 space-y-4">
          <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-[#121212] border border-rose-500/20 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-rose-400 text-sm">{error}</div>
          <button
            type="button"
            onClick={fetchUpdates}
            className="min-h-[44px] px-4 py-2 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition inline-flex items-center justify-center gap-2 font-medium"
          >
            <RefreshCcw className="w-4 h-4" />
            Tekrar Dene
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#121212] border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/50 text-sm">{getEmptyStateMessage()}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-white/50 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-medium">Başlık</th>
                  <th className="py-3 px-4 font-medium">Durum</th>
                  <th className="py-3 px-4 font-medium">Yayın Tarihi</th>
                  <th className="py-3 px-4 font-medium">Oluşturulma</th>
                  <th className="py-3 px-4 font-medium">Güncellenme</th>
                  <th className="py-3 px-4 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'published' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Yayında
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/60 border border-white/10">
                          Taslak
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {formatDateTime(item.published_at)}
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {formatDateTime(item.updated_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item.id)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white/60 hover:text-white rounded-lg transition"
                          title="Düzenle"
                          aria-label={`Düzenle: ${item.title}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-rose-400/70 hover:text-rose-400 rounded-lg transition"
                          title="Sil"
                          aria-label={`Sil: ${item.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-[#121212] border border-white/10 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white leading-snug">
                    {item.title}
                  </h3>
                  {item.status === 'published' ? (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Yayında
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/60 border border-white/10">
                      Taslak
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/50 pt-2 border-t border-white/5">
                  <div>
                    <span className="block text-white/30 text-[10px]">Yayın Tarihi</span>
                    {formatDateTime(item.published_at)}
                  </div>
                  <div>
                    <span className="block text-white/30 text-[10px]">Güncellenme</span>
                    {formatDateTime(item.updated_at)}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item.id)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition inline-flex items-center gap-1.5 font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(item.id)}
                    className="min-h-[44px] px-3 py-1.5 text-xs text-rose-400/90 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition inline-flex items-center gap-1.5 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-white/40">
                Sayfa {page} / {lastPage} (Toplam {total})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="min-h-[44px] px-3 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                  disabled={page >= lastPage}
                  className="min-h-[44px] px-3 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition inline-flex items-center gap-1"
                >
                  Sonraki
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      <CommunityUpdateEditorModal
        updateId={editingId}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        onSuccess={handleEditorSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-[#121212] border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 id="delete-dialog-title" className="text-base font-semibold text-white">
                Duyuruyu Sil
              </h2>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Bu duyuruyu silmek istediğinize emin misiniz?
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="min-h-[44px] px-5 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg transition"
              >
                {isDeleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
