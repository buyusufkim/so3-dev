import { useEffect, useState, useRef, useCallback } from "react";
import { Pen, Trash2, Plus, X, Calendar } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerProgramDay,
  TrainerProgramExercise,
  isTrainerProgramDayArray,
  isTrainerProgramDayCreateResponse,
  isSuccessResponse
} from "./types";

interface TrainerProgramDaysPanelProps {
  programId: number;
  onDaysChange?: (days: TrainerProgramDay[]) => void;
  onDayDeleted?: () => void;
  exercises?: TrainerProgramExercise[];
}

class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractValidationError";
  }
}

interface DayFormData {
  title: string;
  notes: string;
  sortOrder: string;
}

const DEFAULT_DAY_FORM: DayFormData = {
  title: "",
  notes: "",
  sortOrder: "0"
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof ContractValidationError) {
    return err.message;
  }
  if (err instanceof ApiError) {
    if (err.code === "TRAINER_PROFILE_NOT_LINKED") {
      return "Aktif eğitmen profiliniz hesabınıza bağlanmamış.";
    }
    if (err.status === 404 || err.code === "NOT_FOUND") {
      return "Program veya gün bulunamadı ya da erişim yetkiniz yok.";
    }
    if (err.status === 403 || err.code === "FORBIDDEN") {
      return "Bu işlem için yetkiniz yok.";
    }
    if (err.status === 422 || err.code === "VALIDATION_ERROR") {
      return err.message || "Doğrulama hatası.";
    }
    return "Beklenmeyen bir hata oluştu.";
  }
  return "Beklenmeyen bir hata oluştu.";
};

export function TrainerProgramDaysPanel({
  programId,
  onDaysChange,
  onDayDeleted,
  exercises = []
}: TrainerProgramDaysPanelProps) {
  const [days, setDays] = useState<TrainerProgramDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<DayFormData>(DEFAULT_DAY_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState<DayFormData>(DEFAULT_DAY_FORM);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSubmitting = useRef(false);
  const isDeleting = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenRef = useRef(0);

  const onDaysChangeRef = useRef(onDaysChange);
  onDaysChangeRef.current = onDaysChange;

  const onDayDeletedRef = useRef(onDayDeleted);
  onDayDeletedRef.current = onDayDeleted;

  const isDirty =
    formData.title !== initialSnapshot.title ||
    formData.notes !== initialSnapshot.notes ||
    formData.sortOrder !== initialSnapshot.sortOrder;

  const fetchDays = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentGen = ++requestGenRef.current;

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/trainer/training-programs/${programId}/days`, {
        signal: controller.signal
      });

      if (!isMountedRef.current || currentGen !== requestGenRef.current) return;

      if (!isTrainerProgramDayArray(res)) {
        throw new ContractValidationError("Program günleri verisi doğrulanamadı.");
      }

      setDays(res);
      if (onDaysChangeRef.current) {
        onDaysChangeRef.current(res);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || currentGen !== requestGenRef.current) return;
      if (err instanceof Error && err.name === "AbortError") return;
      setError(getErrorMessage(err));
    } finally {
      if (isMountedRef.current && currentGen === requestGenRef.current) {
        setLoading(false);
      }
    }
  }, [programId]);

  useEffect(() => {
    isMountedRef.current = true;
    if (programId > 0) {
      fetchDays();
    }
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [programId, fetchDays]);

  const resetForm = () => {
    setFormData(DEFAULT_DAY_FORM);
    setInitialSnapshot(DEFAULT_DAY_FORM);
    setFormError(null);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const openNewModal = () => {
    setEditingId(null);
    const nextSort = days.length > 0 ? Math.max(...days.map((d) => d.sort_order)) + 1 : 0;
    const initial: DayFormData = {
      title: "",
      notes: "",
      sortOrder: nextSort.toString()
    };
    setFormData(initial);
    setInitialSnapshot(initial);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (day: TrainerProgramDay) => {
    setEditingId(day.id);
    const initial: DayFormData = {
      title: day.title,
      notes: day.notes || "",
      sortOrder: day.sort_order.toString()
    };
    setFormData(initial);
    setInitialSnapshot(initial);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isDirty && !window.confirm("Kaydedilmemiş değişiklikler var. Kapatmak istediğinize emin misiniz?")) {
      return;
    }
    resetForm();
  };

  const handleFieldChange = <K extends keyof DayFormData>(field: K, value: DayFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSaving || isSubmitting.current) return;

    setFormError(null);

    const trimmedTitle = formData.title.trim();
    const titleLen = Array.from(trimmedTitle).length;
    if (titleLen < 1 || titleLen > 160) {
      setFormError("Gün başlığı 1 ile 160 karakter arasında olmalıdır.");
      return;
    }

    if (formData.notes) {
      const notesLen = Array.from(formData.notes.trim()).length;
      if (notesLen > 2000) {
        setFormError("Notlar en fazla 2000 karakter olabilir.");
        return;
      }
    }

    if (!/^(0|[1-9]\d*)$/.test(formData.sortOrder)) {
      setFormError("Sıra geçerli bir pozitif tam sayı olmalıdır.");
      return;
    }
    const soNum = parseInt(formData.sortOrder, 10);
    if (soNum < 0 || soNum > 2147483647) {
      setFormError("Sıra 0 veya daha büyük bir tam sayı olmalıdır.");
      return;
    }

    isSubmitting.current = true;
    setFormSaving(true);

    try {
      if (editingId) {
        const payload = {
          title: trimmedTitle,
          notes: formData.notes.trim() === "" ? null : formData.notes.trim(),
          sort_order: soNum
        };
        const res = await apiClient.patch(`/api/trainer/program-days/${editingId}`, payload);
        if (!isSuccessResponse(res) || !res.success) {
          throw new ContractValidationError("Program günü işlemi yanıtı doğrulanamadı.");
        }
      } else {
        const payload = {
          title: trimmedTitle,
          notes: formData.notes.trim() === "" ? null : formData.notes.trim(),
          sort_order: soNum
        };
        const res = await apiClient.post(`/api/trainer/training-programs/${programId}/days`, payload);
        if (!isTrainerProgramDayCreateResponse(res)) {
          throw new ContractValidationError("Program günü oluşturma yanıtı doğrulanamadı.");
        }
      }

      await fetchDays();
      resetForm();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      isSubmitting.current = false;
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isDeleting.current) return;
    const confirmed = window.confirm(
      "Bu program gününü silmek istediğinize emin misiniz? Bu gündeki egzersizler silinmez, “Gün Atanmamış” bölümüne taşınır."
    );
    if (!confirmed) return;

    isDeleting.current = true;
    setDeletingId(id);
    try {
      const res = await apiClient.delete(`/api/trainer/program-days/${id}`);
      if (!isSuccessResponse(res) || !res.success) {
        throw new ContractValidationError("Program günü silme yanıtı doğrulanamadı.");
      }
      await fetchDays();
      if (onDayDeletedRef.current) {
        onDayDeletedRef.current();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      isDeleting.current = false;
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div id="trainer-days-loading" className="text-white/50 text-sm py-4">
        Program günleri yükleniyor...
      </div>
    );
  }

  return (
    <div id="trainer-program-days-panel" className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white/70" />
            Program Günleri
          </h3>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5">
            Egzersizleri program günlerine ayırarak planı daha düzenli yönetin.
          </p>
        </div>
        <button
          id="btn-add-day"
          type="button"
          onClick={openNewModal}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Yeni Gün
        </button>
      </div>

      {error && (
        <div id="trainer-days-error" className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {days.length === 0 ? (
        <div
          id="trainer-days-empty"
          className="bg-[#121212] border border-white/10 rounded-xl p-6 sm:p-8 text-center space-y-3"
        >
          <p className="text-white/50 text-sm">Henüz program günü oluşturulmamış.</p>
          <button
            type="button"
            onClick={openNewModal}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            İlk Günü Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {days.map((day) => {
            const exerciseCount = exercises.filter((ex) => ex.program_day_id === day.id).length;
            return (
              <div
                key={day.id}
                id={`trainer-day-card-${day.id}`}
                className="bg-[#121212] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-white/20 transition-colors shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-xs font-mono font-medium border border-white/10">
                      #{day.sort_order}
                    </span>
                    <span className="text-xs text-white/50 font-medium">
                      {exerciseCount} egzersiz
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-base leading-snug">
                    {day.title}
                  </h4>
                  {day.notes && (
                    <p className="text-xs text-white/60 line-clamp-2">
                      {day.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => openEditModal(day)}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition"
                    aria-label="Günü Düzenle"
                  >
                    <Pen className="w-3.5 h-3.5" />
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(day.id)}
                    disabled={deletingId === day.id}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    aria-label="Günü Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Günü Sil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div
          id="trainer-day-modal-backdrop"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trainer-day-form-title"
        >
          <div
            id="trainer-day-modal"
            className="bg-[#1a1a1a] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[calc(100dvh-env(safe-area-inset-top))] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 id="trainer-day-form-title" className="text-lg sm:text-xl font-semibold text-white truncate">
                {editingId ? "Program Gününü Düzenle" : "Yeni Program Günü Ekle"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 -mr-2 text-white/50 hover:text-white rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {formError && (
                <div id="trainer-day-form-error" className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <form id="trainer-day-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Başlık *</label>
                  <input
                    id="day-title-input"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    placeholder="Örn: Gün 1 - Göğüs & Triceps"
                    className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sıra *</label>
                  <input
                    id="day-sort-order-input"
                    type="text"
                    required
                    value={formData.sortOrder}
                    onChange={(e) => handleFieldChange("sortOrder", e.target.value)}
                    className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notlar</label>
                  <textarea
                    id="day-notes-input"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => handleFieldChange("notes", e.target.value)}
                    className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                    placeholder="Günün odak noktası, ısınma önerileri veya özel talimatlar..."
                  />
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <button
                id="btn-cancel-day"
                type="button"
                onClick={handleCloseModal}
                disabled={formSaving}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center"
              >
                İptal
              </button>
              <button
                id="btn-save-day"
                type="submit"
                form="trainer-day-form"
                disabled={formSaving}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition disabled:opacity-50 flex items-center justify-center shadow-sm"
              >
                {formSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
