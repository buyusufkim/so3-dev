import { useState, useEffect, useRef } from "react";
import { X, Save } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  MemberProgressNoteDetail,
  MemberProgressNotePayload,
  isMemberProgressNoteCreateResponse,
  isMemberProgressSuccessResponse
} from "../member-progress/types";

interface TrainerProgressNoteFormModalProps {
  memberId: number;
  initialData?: MemberProgressNoteDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

const formatDateForInput = (sqlDate: string): string => {
  if (!sqlDate) return "";
  return sqlDate.replace(" ", "T");
};

export function TrainerProgressNoteFormModal({
  memberId,
  initialData,
  onClose,
  onSuccess
}: TrainerProgressNoteFormModalProps) {
  const isSubmitting = useRef(false);
  const isMounted = useRef(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordedAt, setRecordedAt] = useState("");
  const [note, setNote] = useState("");

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      setRecordedAt(formatDateForInput(initialData.recorded_at));
      setNote(initialData.note);
    } else {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
      )}`;
      setRecordedAt(localStr);
    }
  }, [initialData]);

  const validateAndGetPayload = (): MemberProgressNotePayload | null => {
    setError(null);

    if (!recordedAt) {
      setError("Tarih zorunludur.");
      return null;
    }

    const sqlDate =
      recordedAt.length === 16
        ? recordedAt.replace("T", " ") + ":00"
        : recordedAt.replace("T", " ");
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

    if (note.trim() === "") {
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
      if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
        setError("Aktif eğitmen profiliniz hesabınıza bağlanmamış.");
      } else if (err.status === 403 || err.code === "FORBIDDEN") {
        setError("Bu işlem için yetkiniz yok.");
      } else if (err.status === 404 || err.code === "NOT_FOUND") {
        setError("Üye veya gelişim notu bulunamadı / erişilemiyor.");
      } else if (err.status === 409 || err.code === "CONFLICT") {
        setError("Kayıt durumu değişmiş veya işlem çakışmış olabilir.");
      } else if (err.status === 413 || err.code === "PAYLOAD_TOO_LARGE") {
        setError("Veri boyutu sınırı aşıldı.");
      } else if (err.status === 415 || err.code === "UNSUPPORTED_MEDIA_TYPE") {
        setError("Desteklenmeyen istek formatı.");
      } else if (err.status === 422 || err.code === "VALIDATION_ERROR") {
        setError(err.message || "Form verilerini kontrol edin.");
      } else {
        setError(err.message || "İşlem tamamlanamadı.");
      }
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("İşlem tamamlanamadı.");
    }
  };

  const handleSave = async () => {
    if (isSubmitting.current) return;

    const payload = validateAndGetPayload();
    if (!payload) return;

    if (initialData) {
      const patchPayload: Partial<MemberProgressNotePayload> = {};
      let hasChanges = false;

      if (payload.recorded_at !== initialData.recorded_at) {
        patchPayload.recorded_at = payload.recorded_at;
        hasChanges = true;
      }
      if (payload.note !== initialData.note) {
        patchPayload.note = payload.note;
        hasChanges = true;
      }

      if (!hasChanges) {
        onClose();
        return;
      }

      isSubmitting.current = true;
      setSaving(true);
      setError(null);

      try {
        const res = await apiClient.patch(
          `/api/trainer/member-progress-notes/${initialData.id}`,
          patchPayload
        );
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
        const res = await apiClient.post(
          `/api/trainer/members/${memberId}/progress-notes`,
          payload
        );
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
      if (
        !window.confirm(
          "Kaydedilmemiş değişiklikler var. Çıkmak istiyor musunuz?"
        )
      ) {
        return;
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">
              {initialData ? "Gelişim Notunu Düzenle" : "Yeni Gelişim Notu"}
            </h3>
            <p className="text-xs text-white/50 mt-1">
              {initialData
                ? "Gelişim notu kaydını ve tarihini güncelleyin."
                : "Üyenin antrenman adaptasyonu ve gelişim sürecine ait not ekleyin."}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleClose}
            className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition disabled:opacity-50"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Tarih */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
              Kayıt Tarihi ve Saati <span className="text-[#851C35]">*</span>
            </label>
            <input
              type="datetime-local"
              step="1"
              value={recordedAt}
              disabled={saving}
              onChange={(e) => {
                setRecordedAt(e.target.value);
                setIsDirty(true);
              }}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#851C35] disabled:opacity-50 transition"
            />
          </div>

          {/* Not */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                Gelişim Notu <span className="text-[#851C35]">*</span>
              </label>
              <span className="text-[11px] text-white/40">
                {Array.from(note).length} / 5000
              </span>
            </div>
            <textarea
              rows={8}
              value={note}
              disabled={saving}
              onChange={(e) => {
                setNote(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Antrenman performansı, kondisyon seviyesi, form ve teknik geri bildirimler..."
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] disabled:opacity-50 transition resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-white/[0.01]">
          <button
            type="button"
            disabled={saving}
            onClick={handleClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-[#851C35] hover:bg-[#851C35]/90 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-[#851C35]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Kaydediliyor..." : initialData ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
