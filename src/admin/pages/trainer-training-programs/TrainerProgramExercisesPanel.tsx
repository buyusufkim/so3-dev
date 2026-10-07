import React, { useEffect, useState, useRef, useCallback } from "react";
import { Pen, Trash2, Plus, X, Calendar, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
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

  // F.29C - Collapsible day groups (Session-only component state, default expanded)
  const [collapsedDayIds, setCollapsedDayIds] = useState<Record<number, boolean>>({});

  // F.29C - Quick move per-exercise state
  const [selectedMoveDays, setSelectedMoveDays] = useState<Record<number, string>>({});
  const [movingExerciseId, setMovingExerciseId] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

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
      const res = await apiClient.get(`/api/trainer/training-programs/${programId}/exercises`, {
        signal: controller.signal
      });

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

  // F.29C - Collapsible toggle helpers (default expanded)
  const isDayCollapsed = (dayId: number): boolean => Boolean(collapsedDayIds[dayId]);

  const toggleDayCollapse = (dayId: number) => {
    setCollapsedDayIds((prev) => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  // F.29C - Quick move helpers
  const getTargetDayValue = (ex: TrainerProgramExercise): string => {
    if (selectedMoveDays[ex.id] !== undefined) {
      return selectedMoveDays[ex.id];
    }
    return ex.program_day_id !== null ? String(ex.program_day_id) : "";
  };

  const handleDaySelectChange = (exerciseId: number, value: string) => {
    setSelectedMoveDays((prev) => ({
      ...prev,
      [exerciseId]: value
    }));
  };

  const handleQuickMove = async (exercise: TrainerProgramExercise, targetVal: string) => {
    const targetProgramDayId = targetVal === "" ? null : parseInt(targetVal, 10);

    // No-op protection: if selected equals current, do not send PATCH
    if (targetProgramDayId === exercise.program_day_id) {
      return;
    }

    // Busy isolation: prevent concurrent move requests on the same exercise
    if (movingExerciseId === exercise.id) {
      return;
    }

    setMovingExerciseId(exercise.id);
    setMoveError(null);

    try {
      // Mutation payload ONLY contains program_day_id
      const res = await apiClient.patch(`/api/trainer/program-exercises/${exercise.id}`, {
        program_day_id: targetProgramDayId
      });

      if (!isSuccessResponse(res) || !res.success) {
        throw new ContractValidationError("Egzersiz taşıma işlemi yanıtı doğrulanamadı.");
      }

      // Clear local selection for this exercise
      setSelectedMoveDays((prev) => {
        const next = { ...prev };
        delete next[exercise.id];
        return next;
      });

      // Canonical refresh after move
      await fetchExercises();
    } catch (err: unknown) {
      setMoveError(getErrorMessage(err));
    } finally {
      setMovingExerciseId(null);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setInitialSnapshot(DEFAULT_FORM_DATA);
    setFormError(null);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    if (isDirty) {
      if (!window.confirm("Kaydedilmemiş değişiklikler var. Kapatmak istediğinize emin misiniz?")) {
        return;
      }
    }
    resetForm();
  };

  const openNewModal = (defaultProgramDayId: number | null = null) => {
    const data: ExerciseFormData = {
      ...DEFAULT_FORM_DATA,
      programDayId: defaultProgramDayId !== null ? String(defaultProgramDayId) : ""
    };
    setFormData(data);
    setInitialSnapshot(data);
    setFormError(null);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ex: TrainerProgramExercise) => {
    const data: ExerciseFormData = {
      exerciseName: ex.exercise_name,
      sets: ex.sets !== null && ex.sets !== undefined ? String(ex.sets) : "",
      repetitions: ex.repetitions || "",
      durationSeconds: ex.duration_seconds !== null && ex.duration_seconds !== undefined ? String(ex.duration_seconds) : "",
      restSeconds: ex.rest_seconds !== null && ex.rest_seconds !== undefined ? String(ex.rest_seconds) : "",
      instructions: ex.instructions || "",
      sortOrder: String(ex.sort_order),
      programDayId: ex.program_day_id !== null && ex.program_day_id !== undefined ? String(ex.program_day_id) : ""
    };
    setFormData(data);
    setInitialSnapshot(data);
    setFormError(null);
    setEditingId(ex.id);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): string | null => {
    const name = formData.exerciseName.trim();
    if (!name) {
      return "Egzersiz adı zorunludur.";
    }
    if (name.length > 160) {
      return "Egzersiz adı en fazla 160 karakter olabilir.";
    }

    if (formData.sets.trim() !== "") {
      const setsNum = Number(formData.sets);
      if (!Number.isInteger(setsNum) || setsNum < 1 || setsNum > 65535) {
        return "Set sayısı 1 ile 65535 arasında bir tam sayı olmalıdır.";
      }
    }

    if (formData.repetitions.trim() !== "") {
      if (formData.repetitions.length > 40) {
        return "Tekrar alanı en fazla 40 karakter olabilir.";
      }
    }

    if (formData.durationSeconds.trim() !== "") {
      const durNum = Number(formData.durationSeconds);
      if (!Number.isInteger(durNum) || durNum < 1 || durNum > 4294967295) {
        return "Süre 1 ile 4294967295 arasında pozitif bir tam sayı olmalıdır.";
      }
    }

    if (formData.restSeconds.trim() !== "") {
      const restNum = Number(formData.restSeconds);
      if (!Number.isInteger(restNum) || restNum < 0 || restNum > 65535) {
        return "Dinlenme süresi 0 ile 65535 arasında bir tam sayı olmalıdır.";
      }
    }

    if (formData.instructions.length > 1000) {
      return "Talimatlar en fazla 1000 karakter olabilir.";
    }

    if (formData.sortOrder.trim() !== "") {
      const sortNum = Number(formData.sortOrder);
      if (!Number.isInteger(sortNum) || sortNum < 0 || sortNum > 2147483647) {
        return "Sıra 0 veya daha büyük bir tam sayı olmalıdır.";
      }
    }

    if (formData.programDayId.trim() !== "") {
      const dayNum = Number(formData.programDayId);
      if (!Number.isInteger(dayNum) || dayNum <= 0) {
        return "Geçersiz program günü seçimi.";
      }
      if (!programDays.some((d) => d.id === dayNum)) {
        return "Seçilen program günü bu programa ait değil.";
      }
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;

    const validationMsg = validateForm();
    if (validationMsg) {
      setFormError(validationMsg);
      return;
    }

    isSubmitting.current = true;
    setFormSaving(true);
    setFormError(null);

    const payload: {
      exercise_name?: string;
      sets?: number | null;
      repetitions?: string | null;
      duration_seconds?: number | null;
      rest_seconds?: number | null;
      instructions?: string | null;
      sort_order?: number;
      program_day_id?: number | null;
    } = {};

    if (!editingId) {
      payload.exercise_name = formData.exerciseName.trim();
      payload.sets = formData.sets.trim() === "" ? null : parseInt(formData.sets, 10);
      payload.repetitions = formData.repetitions.trim() === "" ? null : formData.repetitions.trim();
      payload.duration_seconds = formData.durationSeconds.trim() === "" ? null : parseInt(formData.durationSeconds, 10);
      payload.rest_seconds = formData.restSeconds.trim() === "" ? null : parseInt(formData.restSeconds, 10);
      payload.instructions = formData.instructions.trim() === "" ? null : formData.instructions.trim();
      payload.sort_order = formData.sortOrder.trim() === "" ? 0 : parseInt(formData.sortOrder, 10);
      payload.program_day_id = formData.programDayId.trim() === "" ? null : parseInt(formData.programDayId, 10);
    } else {
      if (formData.exerciseName !== initialSnapshot.exerciseName) {
        payload.exercise_name = formData.exerciseName.trim();
      }
      if (formData.sets !== initialSnapshot.sets) {
        payload.sets = formData.sets.trim() === "" ? null : parseInt(formData.sets, 10);
      }
      if (formData.repetitions !== initialSnapshot.repetitions) {
        payload.repetitions = formData.repetitions.trim() === "" ? null : formData.repetitions.trim();
      }
      if (formData.durationSeconds !== initialSnapshot.durationSeconds) {
        payload.duration_seconds = formData.durationSeconds.trim() === "" ? null : parseInt(formData.durationSeconds, 10);
      }
      if (formData.restSeconds !== initialSnapshot.restSeconds) {
        payload.rest_seconds = formData.restSeconds.trim() === "" ? null : parseInt(formData.restSeconds, 10);
      }
      if (formData.instructions !== initialSnapshot.instructions) {
        payload.instructions = formData.instructions.trim() === "" ? null : formData.instructions.trim();
      }
      if (formData.sortOrder !== initialSnapshot.sortOrder) {
        payload.sort_order = formData.sortOrder.trim() === "" ? 0 : parseInt(formData.sortOrder, 10);
      }
      if (formData.programDayId !== initialSnapshot.programDayId) {
        payload.program_day_id = formData.programDayId.trim() === "" ? null : parseInt(formData.programDayId, 10);
      }

      if (Object.keys(payload).length === 0) {
        resetForm();
        isSubmitting.current = false;
        setFormSaving(false);
        return;
      }
    }

    try {
      if (editingId) {
        const res = await apiClient.patch(`/api/trainer/program-exercises/${editingId}`, payload);
        if (!isSuccessResponse(res) || !res.success) {
          throw new ContractValidationError("Egzersiz güncelleme yanıtı doğrulanamadı.");
        }
      } else {
        const res = await apiClient.post(`/api/trainer/training-programs/${programId}/exercises`, payload);
        if (!isTrainerProgramExerciseCreateResponse(res)) {
          throw new ContractValidationError("Egzersiz oluşturma yanıtı doğrulanamadı.");
        }
      }

      resetForm();
      await fetchExercises();
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

  const dayCount = programDays.length;
  const exerciseCount = exercises.length;
  const unassignedCount = unassignedExercises.length;

  const renderExerciseItems = (exercises: TrainerProgramExercise[]) => (
    <>
      {/* Mobile Cards (< lg) */}
      <div className="lg:hidden divide-y divide-white/10">
        {exercises.map((ex) => {
          const targetDayVal = getTargetDayValue(ex);
          const isNoOp = (targetDayVal === "" ? null : Number(targetDayVal)) === ex.program_day_id;
          const isBusy = movingExerciseId === ex.id;

          return (
            <div key={ex.id} id={`trainer-exercise-row-${ex.id}`} className="p-4 space-y-3">
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

              {/* F.29C Quick Exercise Day Move */}
              {programDays.length > 0 && (
                <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5 space-y-1.5">
                  <label htmlFor={`mobile-quick-move-${ex.id}`} className="text-xs text-white/60 block font-medium">
                    Güne Taşı
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id={`mobile-quick-move-${ex.id}`}
                      value={targetDayVal}
                      onChange={(e) => handleDaySelectChange(ex.id, e.target.value)}
                      disabled={isBusy}
                      className="flex-1 min-h-[44px] bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                      aria-label="Güne Taşı"
                    >
                      <option value="">Gün Atanmamış</option>
                      {programDays.map((d) => (
                        <option key={d.id} value={d.id}>
                          #{d.sort_order} {d.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      id={`btn-quick-move-${ex.id}`}
                      onClick={() => handleQuickMove(ex, targetDayVal)}
                      disabled={isBusy || isNoOp}
                      className="min-h-[44px] px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {isBusy ? "Taşınıyor..." : "Taşı"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id={`btn-edit-exercise-mobile-${ex.id}`}
                  onClick={() => openEditModal(ex)}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition"
                  aria-label="Egzersizi Düzenle"
                >
                  <Pen className="w-3.5 h-3.5" />
                  Düzenle
                </button>
                <button
                  type="button"
                  id={`btn-delete-exercise-mobile-${ex.id}`}
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
          );
        })}
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
              {programDays.length > 0 && (
                <th className="px-4 py-3 font-medium text-white/70">Güne Taşı</th>
              )}
              <th className="px-4 py-3 font-medium text-white/70 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {exercises.map((ex) => {
              const targetDayVal = getTargetDayValue(ex);
              const isNoOp = (targetDayVal === "" ? null : Number(targetDayVal)) === ex.program_day_id;
              const isBusy = movingExerciseId === ex.id;

              return (
                <React.Fragment key={ex.id}>
                  <tr id={`trainer-exercise-row-${ex.id}`} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/70">{ex.sort_order}</td>
                    <td className="px-4 py-3 font-medium">{ex.exercise_name}</td>
                    <td className="px-4 py-3 text-white/70">{ex.sets ?? "-"}</td>
                    <td className="px-4 py-3 text-white/70">{ex.repetitions ?? "-"}</td>
                    <td className="px-4 py-3 text-white/70">{ex.duration_seconds ?? "-"}</td>
                    <td className="px-4 py-3 text-white/70">{ex.rest_seconds ?? "-"}</td>
                    {programDays.length > 0 && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <select
                            id={`desktop-quick-move-${ex.id}`}
                            value={targetDayVal}
                            onChange={(e) => handleDaySelectChange(ex.id, e.target.value)}
                            disabled={isBusy}
                            className="min-h-[44px] bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 max-w-[150px]"
                            aria-label="Güne Taşı"
                          >
                            <option value="">Gün Atanmamış</option>
                            {programDays.map((d) => (
                              <option key={d.id} value={d.id}>
                                #{d.sort_order} {d.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            id={`desktop-btn-quick-move-${ex.id}`}
                            onClick={() => handleQuickMove(ex, targetDayVal)}
                            disabled={isBusy || isNoOp}
                            className="min-h-[44px] px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                          >
                            {isBusy ? "..." : "Taşı"}
                          </button>
                        </div>
                      </td>
                    )}
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
                      <td colSpan={programDays.length > 0 ? 8 : 7} className="px-4 py-2 text-xs text-white/50">
                        <span className="font-semibold text-white/70">Talimat:</span> {ex.instructions}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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

      {/* Program Structure Summary (F.29C - compact count-only summary) */}
      {programDays.length > 0 && (
        <div
          id="trainer-program-structure-summary"
          className="bg-[#121212] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-white/70"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">
              {dayCount} program günü
            </span>
            <span className="text-white/30">•</span>
            <span className="font-semibold text-white">
              {exerciseCount} egzersiz
            </span>
            <span className="text-white/30">•</span>
            <span className="font-semibold text-amber-400">
              {unassignedCount} atanmamış
            </span>
          </div>
        </div>
      )}

      {error && (
        <div id="trainer-exercises-error" className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {moveError && (
        <div id="trainer-move-exercise-error" className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm">
          {moveError}
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
            const isCollapsed = isDayCollapsed(day.id);

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

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* F.29C Collapsible toggle */}
                    <button
                      type="button"
                      id={`btn-toggle-day-collapse-${day.id}`}
                      onClick={() => toggleDayCollapse(day.id)}
                      aria-expanded={!isCollapsed}
                      aria-controls={`trainer-day-exercises-${day.id}`}
                      className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium rounded-lg transition shrink-0"
                    >
                      {isCollapsed ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          Göster
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Daralt
                        </>
                      )}
                    </button>

                    <button
                      id={`btn-add-exercise-day-${day.id}`}
                      type="button"
                      onClick={() => openNewModal(day.id)}
                      className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Bu Güne Egzersiz Ekle
                    </button>
                  </div>
                </div>

                <div
                  id={`trainer-day-exercises-${day.id}`}
                  className={isCollapsed ? "hidden" : undefined}
                >
                  {dayExercises.length === 0 ? (
                    <div className="p-6 text-center text-white/40 text-sm">
                      Bu güne henüz egzersiz atanmamış.
                    </div>
                  ) : (
                    renderExerciseItems(dayExercises)
                  )}
                </div>
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
                className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {formError && (
                <div id="trainer-exercise-form-error" className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs sm:text-sm">
                  {formError}
                </div>
              )}

              {/* Exercise Name */}
              <div>
                <label htmlFor="exercise-name-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Egzersiz Adı <span className="text-red-400">*</span>
                </label>
                <input
                  id="exercise-name-input"
                  name="exerciseName"
                  type="text"
                  required
                  maxLength={160}
                  value={formData.exerciseName}
                  onChange={handleInputChange}
                  placeholder="Örn: Barbell Bench Press"
                  className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Program Day Selection */}
              {programDays.length > 0 && (
                <div>
                  <label htmlFor="exercise-day-select" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-white/50" />
                    Program Günü
                  </label>
                  <select
                    id="exercise-day-select"
                    name="programDayId"
                    value={formData.programDayId}
                    onChange={handleInputChange}
                    className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="">Gün Atanmamış</option>
                    {programDays.map((d) => (
                      <option key={d.id} value={d.id}>
                        #{d.sort_order} {d.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-white/40 mt-1">
                    Egzersizi belirli bir program gününe atayabilir veya atanmamış bırakabilirsiniz.
                  </p>
                </div>
              )}

              {/* Sets & Repetitions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exercise-sets-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                    Set Sayısı
                  </label>
                  <input
                    id="exercise-sets-input"
                    name="sets"
                    type="number"
                    min={1}
                    max={65535}
                    value={formData.sets}
                    onChange={handleInputChange}
                    placeholder="Örn: 4"
                    className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="exercise-reps-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                    Tekrar Sayısı / Bilgisi
                  </label>
                  <input
                    id="exercise-reps-input"
                    name="repetitions"
                    type="text"
                    maxLength={40}
                    value={formData.repetitions}
                    onChange={handleInputChange}
                    placeholder="Örn: 10-12 veya Tükeniş"
                    className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {/* Duration & Rest Seconds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exercise-duration-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                    Süre (saniye)
                  </label>
                  <input
                    id="exercise-duration-input"
                    name="durationSeconds"
                    type="number"
                    min={1}
                    max={4294967295}
                    value={formData.durationSeconds}
                    onChange={handleInputChange}
                    placeholder="Örn: 60"
                    className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="exercise-rest-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                    Dinlenme (saniye)
                  </label>
                  <input
                    id="exercise-rest-input"
                    name="restSeconds"
                    type="number"
                    min={0}
                    max={65535}
                    value={formData.restSeconds}
                    onChange={handleInputChange}
                    placeholder="Örn: 90"
                    className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label htmlFor="exercise-sort-order-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Sıralama (Sort Order)
                </label>
                <input
                  id="exercise-sort-order-input"
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={2147483647}
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full min-h-[44px] bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-mono"
                />
              </div>

              {/* Instructions */}
              <div>
                <label htmlFor="exercise-instructions-input" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5">
                  Talimatlar / Notlar (en fazla 1000 karakter)
                </label>
                <textarea
                  id="exercise-instructions-input"
                  name="instructions"
                  maxLength={1000}
                  rows={3}
                  value={formData.instructions}
                  onChange={handleInputChange}
                  placeholder="Egzersiz uygulanışına dair teknik ipuçları veya notlar..."
                  className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none min-h-[80px]"
                />
                <div className="text-right text-[11px] text-white/40 mt-1">
                  {formData.instructions.length}/1000
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  id="btn-save-exercise"
                  type="submit"
                  disabled={formSaving || (editingId !== null && !isDirty)}
                  className="min-h-[44px] px-5 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {formSaving ? "Kaydediliyor..." : editingId ? "Değişiklikleri Kaydet" : "Egzersiz Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
