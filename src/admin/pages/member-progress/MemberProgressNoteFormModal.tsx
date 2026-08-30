import { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import { apiClient, ApiError } from '../../api/client';
import {
  MemberProgressNoteDetail,
  MemberProgressNotePayload,
  isMemberProgressNoteCreateResponse,
  isMemberProgressSuccessResponse
} from './types';

interface MemberProgressNoteFormModalProps {
  memberId: number;
  initialData?: MemberProgressNoteDetail;
  onClose: () => void;
  onSuccess: () => void;
}

const formatDateForInput = (sqlDate: string): string => {
  if (!sqlDate) return '';
  return sqlDate.replace(' ', 'T');
};

export function MemberProgressNoteFormModal({ memberId, initialData, onClose, onSuccess }: MemberProgressNoteFormModalProps) {
  const isSubmitting = useRef(false);
  const isMounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordedAt, setRecordedAt] = useState('');
  const [note, setNote] = useState('');

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (initialData) {
      setRecordedAt(formatDateForInput(initialData.recorded_at));
      setNote(initialData.note);
    } else {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setRecordedAt(localStr);
    }
  }, [initialData]);

  const validateAndGetPayload = (): MemberProgressNotePayload | null => {
    setError(null);

    if (!recordedAt) {
      setError("Tarih zorunludur.");
      return null;
    }

    const sqlDate = recordedAt.length === 16 ? recordedAt.replace('T', ' ') + ':00' : recordedAt.replace('T', ' ');
    const regex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
    const match = sqlDate.match(regex);
    if (!match) {
      setError("Geçersiz tarih formatı.");
      return null;
    }
    const [, yStr, mStr, dStr, hStr, iStr, sStr] = match;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    const hour = parseInt(hStr, 10);
    const minute = parseInt(iStr, 10);
    const second = parseInt(sStr, 10);
    const dObj = new Date(year, month - 1, day, hour, minute, second);
    if (
      dObj.getFullYear() !== year ||
      dObj.getMonth() !== month - 1 ||
      dObj.getDate() !== day ||
      dObj.getHours() !== hour ||
      dObj.getMinutes() !== minute ||
      dObj.getSeconds() !== second
    ) {
      setError("Geçersiz bir takvim tarihi girdiniz.");
      return null;
    }

    if (note.trim() === '') {
      setError("Not içeriği boş olamaz.");
      return null;
    }

    if (Array.from(note).length > 5000) {
      setError("Not içeriği en fazla 5000 karakter olabilir.");
      return null;
    }

    return {
      recorded_at: sqlDate,
      note: note
    };
  };

  const handleApiError = (err: unknown) => {
    if (!isMounted.current) return;
    if (err instanceof ApiError) {
      if (err.code === 'MEMBER_TRAINER_NOT_ASSIGNED') {
        setError("Üyeye eğitmen atanmamış.");
      } else if (err.code === 'MEMBER_TRAINER_INVALID') {
        setError("Üyenin atanmış eğitmeni pasif veya geçersiz.");
      } else if (err.status === 403) {
        setError("Bu işlem için yetkiniz yok.");
      } else if (err.status === 404) {
        setError("Gelişim notu bulunamadı.");
      } else if (err.status === 409) {
        setError("İşlem çakışması veya veri bütünlüğü hatası.");
      } else if (err.status === 422) {
        setError("Girdiğiniz bilgileri kontrol edin.");
      } else {
        setError("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
      }
    } else {
      setError("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
    }
  };

  const handleSave = async () => {
    if (isSubmitting.current) return;

    const payload = validateAndGetPayload();
    if (!payload) return;

    if (initialData) {
      const patchPayload: Partial<MemberProgressNotePayload> = {};
      let hasChanges = false;

      if (payload.recorded_at !== initialData.recorded_at) { patchPayload.recorded_at = payload.recorded_at; hasChanges = true; }
      if (payload.note !== initialData.note) { patchPayload.note = payload.note; hasChanges = true; }

      if (!hasChanges) {
        onClose();
        return;
      }

      isSubmitting.current = true;
      setSaving(true);
      setError(null);

      try {
        const res: unknown = await apiClient.patch(`/api/admin/member-progress-notes/${initialData.id}`, patchPayload);
        if (!isMemberProgressSuccessResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt döndü.");
        }
        if (!isMounted.current) return;
        setIsDirty(false);
        onSuccess();
      } catch (err: unknown) {
        handleApiError(err);
      } finally {
        isSubmitting.current = false;
        if (isMounted.current) setSaving(false);
      }
    } else {
      isSubmitting.current = true;
      setSaving(true);
      setError(null);

      try {
        const res: unknown = await apiClient.post(`/api/admin/members/${memberId}/progress-notes`, payload);
        if (!isMemberProgressNoteCreateResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt döndü.");
        }
        if (!isMounted.current) return;
        setIsDirty(false);
        onSuccess();
      } catch (err: unknown) {
        handleApiError(err);
      } finally {
        isSubmitting.current = false;
        if (isMounted.current) setSaving(false);
      }
    }
  };

  const handleClose = () => {
    if (saving) return;
    if (isDirty) {
      if (window.confirm("Kaydedilmemiş değişiklikler var. Çıkmak istiyor musunuz?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            {initialData ? "Gelişim Notunu Düzenle" : "Yeni Gelişim Notu"}
          </h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-white transition disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div role="alert" className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tarih <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                step="1"
                value={recordedAt}
                onChange={handleChange(setRecordedAt)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Not İçeriği <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={handleChange(setNote)}
                rows={8}
                placeholder="Gelişim notunuzu buraya girin..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition custom-scrollbar"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 font-medium shadow-lg shadow-blue-500/20"
          >
            <Save className="w-5 h-5" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
