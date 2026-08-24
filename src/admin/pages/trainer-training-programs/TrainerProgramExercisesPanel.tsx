import React, { useEffect, useState, useRef } from "react";
import { Pen, Trash2, Plus } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerProgramExercise,
  isTrainerProgramExerciseArray,
  isTrainerProgramExerciseCreateResponse,
  isSuccessResponse
} from "./types";

interface TrainerProgramExercisesPanelProps {
  programId: number;
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
}

const DEFAULT_FORM_DATA: ExerciseFormData = {
  exerciseName: "",
  sets: "",
  repetitions: "",
  durationSeconds: "",
  restSeconds: "",
  instructions: "",
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

export function TrainerProgramExercisesPanel({ programId }: TrainerProgramExercisesPanelProps) {
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

  const isDirty =
    formData.exerciseName !== initialSnapshot.exerciseName ||
    formData.sets !== initialSnapshot.sets ||
    formData.repetitions !== initialSnapshot.repetitions ||
    formData.durationSeconds !== initialSnapshot.durationSeconds ||
    formData.restSeconds !== initialSnapshot.restSeconds ||
    formData.instructions !== initialSnapshot.instructions ||
    formData.sortOrder !== initialSnapshot.sortOrder;

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/trainer/training-programs/${programId}/exercises`);
      if (!isTrainerProgramExerciseArray(res)) {
        throw new ContractValidationError("Egzersiz verisi doğrulanamadı.");
      }
      setExercises(res);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (programId > 0) {
      fetchExercises();
    }
  }, [programId]);

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setInitialSnapshot(DEFAULT_FORM_DATA);
    setFormError(null);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const openNewModal = () => {
    setEditingId(null);
    const nextSort = exercises.length > 0 ? Math.max(...exercises.map((e) => e.sort_order)) + 1 : 0;
    const initial: ExerciseFormData = {
      exerciseName: "",
      sets: "",
      repetitions: "",
      durationSeconds: "",
      restSeconds: "",
      instructions: "",
      sortOrder: nextSort.toString()
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
      sortOrder: ex.sort_order.toString()
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

  return (
    <div id="trainer-program-exercises-panel" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Egzersizler</h3>
        <button
          id="btn-add-exercise"
          type="button"
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Egzersiz
        </button>
      </div>

      {error && (
        <div id="trainer-exercises-error" className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {exercises.length === 0 ? (
        <div id="trainer-exercises-empty" className="text-center py-8 text-white/50 border border-white/10 rounded-lg">
          Henüz egzersiz eklenmemiş.
        </div>
      ) : (
        <div id="trainer-exercises-table-container" className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
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
                            className="p-2 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white"
                            title="Düzenle"
                          >
                            <Pen className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-exercise-${ex.id}`}
                            type="button"
                            onClick={() => handleDelete(ex.id)}
                            disabled={deletingId === ex.id}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition text-red-500/70 hover:text-red-500 disabled:opacity-50"
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
        </div>
      )}

      {isModalOpen && (
        <div id="trainer-exercise-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div id="trainer-exercise-modal" className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold">
                {editingId ? "Egzersizi Düzenle" : "Yeni Egzersiz Ekle"}
              </h3>
            </div>

            <div className="p-6">
              {formError && (
                <div id="trainer-exercise-form-error" className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-sm">
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
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Set</label>
                    <input
                      id="exercise-sets-input"
                      type="text"
                      value={formData.sets}
                      onChange={(e) => handleFieldChange("sets", e.target.value)}
                      placeholder="Örn: 3"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Süre (saniye)</label>
                    <input
                      id="exercise-duration-input"
                      type="text"
                      value={formData.durationSeconds}
                      onChange={(e) => handleFieldChange("durationSeconds", e.target.value)}
                      placeholder="Örn: 60"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
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
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                    placeholder="Egzersiz hakkında notlar..."
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                id="btn-cancel-exercise"
                type="button"
                onClick={handleCloseModal}
                disabled={formSaving}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded transition disabled:opacity-50"
              >
                İptal
              </button>
              <button
                id="btn-save-exercise"
                type="submit"
                form="trainer-exercise-form"
                disabled={formSaving}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition disabled:opacity-50"
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
