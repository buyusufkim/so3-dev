import React, { useEffect, useState, useRef, useCallback } from "react";
import { Pen, Trash2, Plus, X, Calendar, Dumbbell } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerProgramDay,
  TrainerProgramExercise,
  isTrainerProgramExerciseArray,
  isTrainerProgramExerciseCreateResponse,
  isSuccessResponse
} from "./types";

interface TrainerProgramExercisesPanelProps {
  programId: number;
  programDays?: TrainerProgramDay[];
  refreshKey?: number;
  onExercisesChange?: (exercises: TrainerProgramExercise[]) => void;
}

class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractValidationError";
  }
}

interface ExerciseFormData {
  exerciseName: string;
  sets: string;
  repetitions: string;
  durationSeconds: string;
  restSeconds: string;
  instructions: string;
  sortOrder: string;
  programDayId: string;
}

const DEFAULT_FORM_DATA: ExerciseFormData = {
  exerciseName: "",
  sets: "",
  repetitions: "",
  durationSeconds: "",
  restSeconds: "",
  instructions: "",
  sortOrder: "0",
  programDayId: ""
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
      return "Program veya egzersiz bulunamadı ya da erişim yetkiniz yok.";
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

export function TrainerProgramExercisesPanel({
  programId,
  programDays = [],
  refreshKey = 0,
  onExercisesChange
}: TrainerProgramExercisesPanelProps) {
  const [exercises, setExercises] = useState<TrainerProgramExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<ExerciseFormData>(DEFAULT_FORM_DATA);
  const [initialSnapshot, setInitialSnapshot] = useState<ExerciseFormData>(DEFAULT_FORM_DATA);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSubmitting = useRef(false);
  const isDeleting = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenRef = useRef(0);

  const onExercisesChangeRef = useRef(onExercisesChange);
  onExercisesChangeRef.current = onExercisesChange;

  const isDirty =
    formData.exerciseName !== initialSnapshot.exerciseName ||
    formData.sets !== initialSnapshot.sets ||
    formData.repetitions !== initialSnapshot.repetitions ||
    formData.durationSeconds !== initialSnapshot.durationSeconds ||
    formData.restSeconds !== initialSnapshot.restSeconds ||
    formData.instructions !== initialSnapshot.instructions ||
    formData.sortOrder !== initialSnapshot.sortOrder ||
    formData.programDayId !== initialSnapshot.programDayId;

  const fetchExercises = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentGen = ++requestGenRef.current;

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(
        `/api/trainer/training-programs/${programId}/exercises`,
        {
          signal: controller.signal
        }
      );

      if (!isMountedRef.current || currentGen !== requestGenRef.current) return;

      if (!isTrainerProgramExerciseArray(res)) {
        throw new ContractValidationError("Egzersiz verisi doğrulanamadı.");
      }

      setExercises(res);
      if (onExercisesChangeRef.current) {
        onExercisesChangeRef.current(res);
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
      fetchExercises();
    }
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [programId, refreshKey, fetchExercises]);

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setInitialSnapshot(DEFAULT_FORM_DATA);
    setFormError(null);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const openNewModal = (presetDayId?: number | null) => {
    setEditingId(null);
    const nextSort = exercises.length > 0 ? Math.max(...exercises.map((e) => e.sort_order)) + 1 : 0;
    const initial: ExerciseFormData = {
      exerciseName: "",
      sets: "",
      repetitions: "",
      durationSeconds: "",
      restSeconds: "",
      instructions: "",
      sortOrder: nextSort.toString(),
      programDayId: presetDayId ? presetDayId.toString() : ""
    };
    setFormData(initial);
    setInitialSnapshot(initial);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ex: TrainerProgramExercise) => {
    setEditingId(ex.id);
    const initial: ExerciseFormData = {
      exerciseName: ex.exercise_name,
      sets: ex.sets === null ? "" : ex.sets.toString(),
      repetitions: ex.repetitions === null ? "" : ex.repetitions,
      durationSeconds: ex.duration_seconds === null ? "" : ex.duration_seconds.toString(),
      restSeconds: ex.rest_seconds === null ? "" : ex.rest_seconds.toString(),
      instructions: ex.instructions === null ? "" : ex.instructions,
      sortOrder: ex.sort_order.toString(),
      programDayId: ex.program_day_id !== null && ex.program_day_id !== undefined ? ex.program_day_id.toString() : ""
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

  const handleFieldChange = <K extends keyof ExerciseFormData>(field: K, value: ExerciseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSaving || isSubmitting.current) return;

    setFormError(null);

    const trimmedName = formData.exerciseName.trim();
    const nameLen = Array.from(trimmedName).length;
    if (nameLen < 1 || nameLen > 160) {
      setFormError("Egzersiz adı 1-160 karakter arasında olmalıdır.");
      return;
    }

    const payload: Record<string, unknown> = {
      exercise_name: trimmedName
    };

    // Day validation & assignment
    if (formData.programDayId !== "") {
      if (!/^[1-9]\d*$/.test(formData.programDayId)) {
        setFormError("Geçersiz program günü seçimi.");
        return;
      }
      const dayIdNum = parseInt(formData.programDayId, 10);
      if (programDays.length > 0 && !programDays.some((d) => d.id === dayIdNum)) {
        setFormError("Seçilen program günü bu programa ait değil.");
        return;
      }
      payload.program_day_id = dayIdNum;
    } else {
      payload.program_day_id = null;
    }

    if (formData.sets !== "") {
      if (!/^[1-9]\d*$/.test(formData.sets)) {
        setFormError("Set geçerli bir pozitif tam sayı olmalıdır.");
        return;
      }
      const setsNum = parseInt(formData.sets, 10);
      if (setsNum < 1 || setsNum > 65535) {
        setFormError("Set 1-65535 arasında olmalıdır.");
        return;
      }
      payload.sets = setsNum;
    } else {
      payload.sets = null;
    }

    if (formData.repetitions !== "") {
      if (Array.from(formData.repetitions).length > 40) {
        setFormError("Tekrar en fazla 40 karakter olabilir.");
        return;
      }
      payload.repetitions = formData.repetitions;
    } else {
      payload.repetitions = null;
    }

    if (formData.durationSeconds !== "") {
      if (!/^[1-9]\d*$/.test(formData.durationSeconds)) {
        setFormError("Süre geçerli bir pozitif tam sayı olmalıdır.");
        return;
      }
      const durNum = parseInt(formData.durationSeconds, 10);
      if (durNum < 1 || durNum > 4294967295) {
        setFormError("Süre 1-4294967295 arasında olmalıdır.");
        return;
      }
      payload.duration_seconds = durNum;
    } else {
      payload.duration_seconds = null;
    }

    if (formData.restSeconds !== "") {
      if (!/^(0|[1-9]\d*)$/.test(formData.restSeconds)) {
        setFormError("Dinlenme geçerli bir negatif olmayan tam sayı olmalıdır.");
        return;
      }
      const restNum = parseInt(formData.restSeconds, 10);
      if (restNum < 0 || restNum > 65535) {
        setFormError("Dinlenme 0-65535 arasında olmalıdır.");
        return;
      }
      payload.rest_seconds = restNum;
    } else {
      payload.rest_seconds = null;
    }

    if (formData.instructions !== "") {
      if (Array.from(formData.instructions).length > 1000) {
        setFormError("Talimat en fazla 1000 karakter olabilir.");
        return;
      }
      payload.instructions = formData.instructions;
    } else {
      payload.instructions = null;
    }

    if (!/^(0|[1-9]\d*)$/.test(formData.sortOrder)) {
      setFormError("Sıra geçerli bir tam sayı olmalıdır.");
      return;
    }
    const soNum = parseInt(formData.sortOrder, 10);
    if (soNum < 0 || soNum > 2147483647) {
      setFormError("Sıra 0-2147483647 arasında olmalıdır.");
      return;
    }
    payload.sort_order = soNum;

    isSubmitting.current = true;
    setFormSaving(true);

    try {
      if (editingId) {
        const res = await apiClient.patch(`/api/trainer/program-exercises/${editingId}`, payload);
        if (!isSuccessResponse(res) || !res.success) {
          throw new ContractValidationError("Egzersiz işlemi yanıtı doğrulanamadı.");
        }
      } else {
        const res = await apiClient.post(`/api/trainer/training-programs/${programId}/exercises`, payload);
        if (!isTrainerProgramExerciseCreateResponse(res)) {
          throw new ContractValidationError("Egzersiz işlemi yanıtı doğrulanamadı.");
        }
      }
      await fetchExercises();
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
    if (!window.confirm("Bu egzersizi silmek istediğinize emin misiniz?")) return;

    isDeleting.current = true;
    setDeletingId(id);
    try {
      const res = await apiClient.delete(`/api/trainer/program-exercises/${id}`);
      if (!isSuccessResponse(res) || !res.success) {
        throw new ContractValidationError("Egzersiz işlemi yanıtı doğrulanamadı.");
      }
      await fetchExercises();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      isDeleting.current = false;
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div id="trainer-exercises-loading" className="text-white/50 text-sm py-4">Egzersizler yükleniyor...</div>;
  }

  // Program days in canonical server-authoritative order
  const unassignedExercises = exercises.filter(
    (ex) => ex.program_day_id === null || !programDays.some((d) => d.id === ex.program_day_id)
  );

  const renderExerciseItems = (exercises: TrainerProgramExercise[]) => (
    <>
      {/* Mobile Cards (< lg) */}
      <div className="lg:hidden divide-y divide-white/10">
        {exercises.map((ex) => (
          <div key={ex.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="shrink-0 px-2 py-0.5 rounded bg-white/5 text-white/60 text-xs font-mono font-medium border border-white/10">
                  #{ex.sort_order}
                </span>
                <h4 className="font-semibold text-white text-base leading-snug">
                  {ex.exercise_name}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-medium">Set</span>
                <span className="mt-0.5 block text-white/80 font-medium">{ex.sets ?? "-"}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-medium">Tekrar</span>
                <span className="mt-0.5 block text-white/80 font-medium">{ex.repetitions ?? "-"}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-medium">Süre</span>
                <span className="mt-0.5 block text-white/80 font-medium">{ex.duration_seconds ? `${ex.duration_seconds} sn` : "-"}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px] uppercase font-medium">Dinlenme</span>
                <span className="mt-0.5 block text-white/80 font-medium">{ex.rest_seconds !== null && ex.rest_seconds !== undefined ? `${ex.rest_seconds} sn` : "-"}</span>
              </div>
            </div>

            {ex.instructions && (
              <div className="text-xs text-white/60 bg-white/[0.01] p-2.5 rounded-lg border border-white/5">
                <span className="font-semibold text-white/80">Talimat: </span>
                <span>{ex.instructions}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => openEditModal(ex)}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition"
                aria-label="Egzersizi Düzenle"
              >
                <Pen className="w-3.5 h-3.5" />
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => handleDelete(ex.id)}
                disabled={deletingId === ex.id}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition disabled:opacity-50"
                aria-label="Egzersizi Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table (>= lg) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 font-medium text-white/70">Sıra</th>
              <th className="px-4 py-3 font-medium text-white/70">Egzersiz Adı</th>
              <th className="px-4 py-3 font-medium text-white/70">Set</th>
              <th className="px-4 py-3 font-medium text-white/70">Tekrar</th>
              <th className="px-4 py-3 font-medium text-white/70">Süre (sn)</th>
              <th className="px-4 py-3 font-medium text-white/70">Dinlenme (sn)</th>
              <th className="px-4 py-3 font-medium text-white/70 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {exercises.map((ex) => (
              <React.Fragment key={ex.id}>
                <tr id={`trainer-exercise-row-${ex.id}`} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white/70">{ex.sort_order}</td>
                  <td className="px-4 py-3 font-medium">{ex.exercise_name}</td>
                  <td className="px-4 py-3 text-white/70">{ex.sets ?? "-"}</td>
                  <td className="px-4 py-3 text-white/70">{ex.repetitions ?? "-"}</td>
                  <td className="px-4 py-3 text-white/70">{ex.duration_seconds ?? "-"}</td>
                  <td className="px-4 py-3 text-white/70">{ex.rest_seconds ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        id={`btn-edit-exercise-${ex.id}`}
                        type="button"
                        onClick={() => openEditModal(ex)}
                        className="p-2 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Düzenle"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-exercise-${ex.id}`}
                        type="button"
                        onClick={() => handleDelete(ex.id)}
                        disabled={deletingId === ex.id}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition text-red-500/70 hover:text-red-500 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {ex.instructions && (
                  <tr id={`trainer-exercise-instructions-${ex.id}`} className="bg-white/[0.02]">
                    <td colSpan={7} className="px-4 py-2 text-xs text-white/50">
                      <span className="font-semibold text-white/70">Talimat:</span> {ex.instructions}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div id="trainer-program-exercises-panel" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-white/70" />
            Egzersizler
          </h3>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5">
            Program egzersizlerini yönetin, günlere atayın veya sırasını belirleyin.
          </p>
        </div>
        <button
          id="btn-add-exercise"
          type="button"
          onClick={() => openNewModal(null)}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Yeni Egzersiz
        </button>
      </div>

      {error && (
        <div id="trainer-exercises-error" className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {exercises.length === 0 ? (
        <div id="trainer-exercises-empty" className="text-center py-8 text-white/50 border border-white/10 rounded-xl bg-[#121212]">
          Henüz egzersiz eklenmemiş.
        </div>
      ) : programDays.length > 0 ? (
        /* Grouped Presentation by Program Day */
        <div id="trainer-exercises-table-container" className="space-y-5">
          {programDays.map((day) => {
            const dayExercises = exercises.filter((ex) => ex.program_day_id === day.id);
            return (
              <div
                key={day.id}
                id={`trainer-day-exercise-group-${day.id}`}
                className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="p-4 bg-white/[0.02] border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white/60 text-xs font-mono font-medium border border-white/10">
                        #{day.sort_order}
                      </span>
                      <h4 className="font-semibold text-white text-base">
                        {day.title}
                      </h4>
                      <span className="text-xs text-white/50 font-medium px-2 py-0.5 rounded bg-white/5">
                        {dayExercises.length} egzersiz
                      </span>
                    </div>
                    {day.notes && (
                      <p className="text-xs text-white/50">{day.notes}</p>
                    )}
                  </div>
                  <button
                    id={`btn-add-exercise-day-${day.id}`}
                    type="button"
                    onClick={() => openNewModal(day.id)}
                    className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Bu Güne Egzersiz Ekle
                  </button>
                </div>

                {dayExercises.length === 0 ? (
                  <div className="p-6 text-center text-white/40 text-sm">
                    Bu güne henüz egzersiz atanmamış.
                  </div>
                ) : (
                  renderExerciseItems(dayExercises)
                )}
              </div>
            );
          })}

          {/* Unassigned / Legacy Exercises Section */}
          {unassignedExercises.length > 0 && (
            <div
              id="trainer-unassigned-exercises-group"
              className="bg-[#121212] border border-amber-500/20 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="p-4 bg-amber-500/[0.03] border-b border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-semibold text-white text-base">
                      Gün Atanmamış Egzersizler
                    </h4>
                    <span className="text-xs text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {unassignedExercises.length} egzersiz
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    Bu egzersizler herhangi bir program gününe atanmamış. Düzenleyerek bir güne atayabilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewModal(null)}
                  className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Atanmamış Egzersiz Ekle
                </button>
              </div>
              {renderExerciseItems(unassignedExercises)}
            </div>
          )}
        </div>
      ) : (
        /* Flat Presentation when zero days created (Backward Compatible) */
        <div id="trainer-exercises-table-container" className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-sm">
          {renderExerciseItems(exercises)}
        </div>
      )}

      {/* Modal for Create/Edit Exercise */}
      {isModalOpen && (
        <div
          id="trainer-exercise-modal-backdrop"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trainer-exercise-form-title"
        >
          <div
            id="trainer-exercise-modal"
            className="bg-[#1a1a1a] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[calc(100dvh-env(safe-area-inset-top))] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 id="trainer-exercise-form-title" className="text-lg sm:text-xl font-semibold text-white truncate">
                {editingId ? "Egzersizi Düzenle" : "Yeni Egzersiz Ekle"}
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
                <div id="trainer-exercise-form-error" className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <form id="trainer-exercise-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Egzersiz Adı *</label>
                  <input
                    id="exercise-name-input"
                    type="text"
                    required
                    value={formData.exerciseName}
                    onChange={(e) => handleFieldChange("exerciseName", e.target.value)}
                    placeholder="Örn: Barbell Squat"
                    className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                {/* Program Day Selector */}
                <div className="space-y-2">
                  <label htmlFor="exercise-day-select" className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-white/60" />
                    Program Günü
                  </label>
                  <select
                    id="exercise-day-select"
                    value={formData.programDayId}
                    onChange={(e) => handleFieldChange("programDayId", e.target.value)}
                    className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                  >
                    <option value="">Gün Atanmamış</option>
                    {programDays.map((day) => (
                      <option key={day.id} value={day.id.toString()}>
                        #{day.sort_order} - {day.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-white/50">
                    Egzersizi belirli bir güne bağlayabilir veya atanmamış bırakabilirsiniz.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Set</label>
                    <input
                      id="exercise-sets-input"
                      type="text"
                      value={formData.sets}
                      onChange={(e) => handleFieldChange("sets", e.target.value)}
                      placeholder="Örn: 3"
                      className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tekrar</label>
                    <input
                      id="exercise-repetitions-input"
                      type="text"
                      value={formData.repetitions}
                      onChange={(e) => handleFieldChange("repetitions", e.target.value)}
                      placeholder="Örn: 10-12"
                      className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Süre (saniye)</label>
                    <input
                      id="exercise-duration-input"
                      type="text"
                      value={formData.durationSeconds}
                      onChange={(e) => handleFieldChange("durationSeconds", e.target.value)}
                      placeholder="Örn: 60"
                      className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dinlenme (saniye)</label>
                    <input
                      id="exercise-rest-input"
                      type="text"
                      value={formData.restSeconds}
                      onChange={(e) => handleFieldChange("restSeconds", e.target.value)}
                      placeholder="Örn: 30"
                      className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sıra *</label>
                    <input
                      id="exercise-sort-order-input"
                      type="text"
                      required
                      value={formData.sortOrder}
                      onChange={(e) => handleFieldChange("sortOrder", e.target.value)}
                      className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Talimat</label>
                  <textarea
                    id="exercise-instructions-input"
                    rows={3}
                    value={formData.instructions}
                    onChange={(e) => handleFieldChange("instructions", e.target.value)}
                    className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-base sm:text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                    placeholder="Egzersiz hakkında notlar..."
                  />
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <button
                id="btn-cancel-exercise"
                type="button"
                onClick={handleCloseModal}
                disabled={formSaving}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center"
              >
                İptal
              </button>
              <button
                id="btn-save-exercise"
                type="submit"
                form="trainer-exercise-form"
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
