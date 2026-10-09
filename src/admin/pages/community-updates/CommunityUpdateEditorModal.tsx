import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '../../api/client';
import {
  CommunityUpdateDetail,
  CommunityUpdateStatus,
  validateCommunityUpdateDetail
} from './types';

interface CommunityUpdateEditorModalProps {
  updateId: number | null; // null for create mode, number for edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CommunityUpdateEditorModal({
  updateId,
  isOpen,
  onClose,
  onSuccess
}: CommunityUpdateEditorModalProps) {
  const isEdit = updateId !== null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<CommunityUpdateStatus>('draft');

  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setBody('');
      setStatus('draft');
      setErrorMessage('');
      setFetchingDetail(false);
      setSubmitting(false);
      return;
    }

    if (isEdit && updateId) {
      let isMounted = true;
      setFetchingDetail(true);
      setErrorMessage('');

      apiClient
        .get(`/api/admin/community-updates/${updateId}`)
        .then((res: unknown) => {
          if (!isMounted) return;
          try {
            const detail: CommunityUpdateDetail = validateCommunityUpdateDetail(res);
            setTitle(detail.title);
            setBody(detail.body);
            setStatus(detail.status);
          } catch {
            setErrorMessage('Duyuru detayları doğrulanamadı.');
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setErrorMessage('Duyuru detayları alınamadı.');
        })
        .finally(() => {
          if (isMounted) setFetchingDetail(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      // Create mode
      setTitle('');
      setBody('');
      setStatus('draft');
      setErrorMessage('');
      setFetchingDetail(false);
    }
  }, [isOpen, isEdit, updateId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || fetchingDetail) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (trimmedTitle.length === 0) {
      setErrorMessage('Başlık zorunludur.');
      return;
    }
    if (trimmedTitle.length > 160) {
      setErrorMessage('Başlık en fazla 160 karakter olabilir.');
      return;
    }

    if (trimmedBody.length === 0) {
      setErrorMessage('İçerik zorunludur.');
      return;
    }
    if (trimmedBody.length > 5000) {
      setErrorMessage('İçerik en fazla 5000 karakter olabilir.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const payload = {
      title: trimmedTitle,
      body: trimmedBody,
      status
    };

    try {
      if (isEdit && updateId) {
        const res = await apiClient.patch(`/api/admin/community-updates/${updateId}`, payload);
        validateCommunityUpdateDetail(res);
      } else {
        const res = await apiClient.post('/api/admin/community-updates', payload);
        validateCommunityUpdateDetail(res);
      }

      onSuccess();
    } catch {
      setErrorMessage(isEdit ? 'Duyuru güncellenemedi.' : 'Duyuru oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-[#121212] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 id="modal-headline" className="text-base font-semibold text-white">
            {isEdit ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white/50 hover:text-white rounded-lg transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {fetchingDetail ? (
          <div className="p-8 text-center text-sm text-white/60">
            Duyuru yükleniyor...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="update-title" className="text-xs font-medium text-white/80">
                  Başlık
                </label>
                <span className="text-[10px] text-white/40">
                  {title.length}/160
                </span>
              </div>
              <input
                id="update-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
                disabled={submitting}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                placeholder="Örn: Hafta Sonu Özel Workshop"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="update-body" className="text-xs font-medium text-white/80">
                  İçerik
                </label>
                <span className="text-[10px] text-white/40">
                  {body.length}/5000
                </span>
              </div>
              <textarea
                id="update-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={8}
                required
                disabled={submitting}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-y"
                placeholder="Topluluk duyurusu metnini girin..."
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="update-status" className="block text-xs font-medium text-white/80 mb-1.5">
                Durum
              </label>
              <select
                id="update-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CommunityUpdateStatus)}
                disabled={submitting}
                className="w-full bg-[#1c1c1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
              </select>
              <p className="mt-1 text-[11px] text-white/40">
                {status === 'published'
                  ? 'Yayındaki duyurular üye portalında hemen görünür olur.'
                  : 'Taslak duyurular yalnızca yönetim tarafından görülebilir.'}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-[44px] px-4 py-2 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] px-5 py-2 text-xs font-medium text-black bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                {submitting
                  ? 'Kaydediliyor...'
                  : isEdit
                  ? 'Değişiklikleri Kaydet'
                  : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
