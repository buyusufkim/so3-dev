import React, { useEffect, useState, useRef } from 'react';
import { Pen, Trash2, Plus } from 'lucide-react';
import { apiClient } from '../../api/client';
import { 
  ProgramExercise, 
  isProgramExerciseArray, 
  isProgramExerciseCreateResponse, 
  isSuccessResponse 
} from './types';

interface ProgramExercisesPanelProps {
  programId: number;
}

export function ProgramExercisesPanel({ programId }: ProgramExercisesPanelProps) {
  const [exercises, setExercises] = useState<ProgramExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [repetitions, setRepetitions] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  const [instructions, setInstructions] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  
  const isSubmitting = useRef(false);
  const isDeleting = useRef(false);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/admin/training-programs/${programId}/exercises`);
      if (isProgramExerciseArray(res)) {
        setExercises(res);
      } else {
        throw new Error("Geçersiz yanıt formatı.");
      }
    } catch (err: any) {
      setError(err?.message || "Egzersizler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [programId]);

  const openNewModal = () => {
    setEditingId(null);
    setExerciseName("");
    setSets("");
    setRepetitions("");
    setDurationSeconds("");
    setRestSeconds("");
    setInstructions("");
    // sortOrder: En büyük sort_order + 1
    const nextSort = exercises.length > 0 ? Math.max(...exercises.map(e => e.sort_order)) + 1 : 0;
    setSortOrder(nextSort.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ex: ProgramExercise) => {
    setEditingId(ex.id);
    setExerciseName(ex.exercise_name);
    setSets(ex.sets === null ? "" : ex.sets.toString());
    setRepetitions(ex.repetitions === null ? "" : ex.repetitions);
    setDurationSeconds(ex.duration_seconds === null ? "" : ex.duration_seconds.toString());
    setRestSeconds(ex.rest_seconds === null ? "" : ex.rest_seconds.toString());
    setInstructions(ex.instructions === null ? "" : ex.instructions);
    setSortOrder(ex.sort_order.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    const isDirty = 
      exerciseName !== "" || 
      sets !== "" || 
      repetitions !== "" || 
      durationSeconds !== "" || 
      restSeconds !== "" || 
      instructions !== "";
      
    if (!editingId && isDirty && !window.confirm("Kaydedilmemiş değişiklikler var. Kapatmak istediğinize emin misiniz?")) {
      return;
    }
    
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSaving || isSubmitting.current) return;

    setFormError(null);

    // Validations
    const trimmedName = exerciseName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 160) {
      setFormError("Egzersiz adı 1-160 karakter arasında olmalıdır.");
      return;
    }

    const payload: Record<string, unknown> = {
      exercise_name: trimmedName,
    };

    // Parse Sets
    if (sets.trim() !== "") {
      if (!/^[1-9]\d*$/.test(sets.trim())) {
        setFormError("Set geçerli bir pozitif tam sayı olmalıdır.");
        return;
      }
      const setsNum = parseInt(sets.trim(), 10);
      if (setsNum < 1 || setsNum > 65535) {
        setFormError("Set 1-65535 arasında olmalıdır.");
        return;
      }
      payload.sets = setsNum;
    } else {
      payload.sets = null;
    }

    // Parse Reps
    if (repetitions.trim() !== "") {
      const repsTrimmed = repetitions.trim();
      if (Array.from(repsTrimmed).length > 40) {
        setFormError("Tekrar en fazla 40 karakter olabilir.");
        return;
      }
      payload.repetitions = repsTrimmed;
    } else {
      payload.repetitions = null;
    }

    // Parse Duration
    if (durationSeconds.trim() !== "") {
      if (!/^[1-9]\d*$/.test(durationSeconds.trim())) {
        setFormError("Süre geçerli bir pozitif tam sayı olmalıdır.");
        return;
      }
      const durNum = parseInt(durationSeconds.trim(), 10);
      if (durNum < 1 || durNum > 4294967295) {
        setFormError("Süre 1-4294967295 arasında olmalıdır.");
        return;
      }
      payload.duration_seconds = durNum;
    } else {
      payload.duration_seconds = null;
    }

    // Parse Rest
    if (restSeconds.trim() !== "") {
      if (!/^(0|[1-9]\d*)$/.test(restSeconds.trim())) {
        setFormError("Dinlenme geçerli bir negatif olmayan tam sayı olmalıdır.");
        return;
      }
      const restNum = parseInt(restSeconds.trim(), 10);
      if (restNum < 0 || restNum > 65535) {
        setFormError("Dinlenme 0-65535 arasında olmalıdır.");
        return;
      }
      payload.rest_seconds = restNum;
    } else {
      payload.rest_seconds = null;
    }

    // Parse Instructions
    if (instructions.trim() !== "") {
      const instTrimmed = instructions.trim();
      if (Array.from(instTrimmed).length > 1000) {
        setFormError("Talimat en fazla 1000 karakter olabilir.");
        return;
      }
      payload.instructions = instTrimmed;
    } else {
      payload.instructions = null;
    }

    // Parse Sort Order
    if (!/^(0|[1-9]\d*)$/.test(sortOrder.trim())) {
      setFormError("Sıra geçerli bir tam sayı olmalıdır.");
      return;
    }
    const soNum = parseInt(sortOrder.trim(), 10);
    if (soNum < 0 || soNum > 2147483647) {
      setFormError("Sıra aralık dışında.");
      return;
    }
    payload.sort_order = soNum;

    isSubmitting.current = true;
    setFormSaving(true);
    
    try {
      if (editingId) {
        const res = await apiClient.patch(`/api/admin/program-exercises/${editingId}`, payload);
        if (!isSuccessResponse(res) || !res.success) {
          throw new Error("Geçersiz yanıt.");
        }
      } else {
        const res = await apiClient.post(`/api/admin/training-programs/${programId}/exercises`, payload);
        if (!isProgramExerciseCreateResponse(res)) {
          throw new Error("Geçersiz yanıt.");
        }
      }
      setIsModalOpen(false);
      fetchExercises();
    } catch (err: any) {
      setFormError(err?.message || "İşlem başarısız.");
    } finally {
      isSubmitting.current = false;
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isDeleting.current) return;
    if (!window.confirm("Bu egzersizi silmek istediğinize emin misiniz?")) return;
    
    isDeleting.current = true;
    try {
      const res = await apiClient.delete(`/api/admin/program-exercises/${id}`);
      if (!isSuccessResponse(res) || !res.success) {
        throw new Error("Geçersiz yanıt.");
      }
      fetchExercises();
    } catch (err: any) {
      alert("Silinemedi: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      isDeleting.current = false;
    }
  };

  if (loading) {
    return <div className="text-white/50 text-sm py-4">Egzersizler yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Egzersizler</h3>
        <button
          type="button"
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Egzersiz
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="text-center py-8 text-white/50 border border-white/10 rounded-lg">
          Henüz egzersiz eklenmemiş.
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
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
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white/70">{ex.sort_order}</td>
                      <td className="px-4 py-3 font-medium">{ex.exercise_name}</td>
                      <td className="px-4 py-3 text-white/70">{ex.sets ?? '-'}</td>
                      <td className="px-4 py-3 text-white/70">{ex.repetitions ?? '-'}</td>
                      <td className="px-4 py-3 text-white/70">{ex.duration_seconds ?? '-'}</td>
                      <td className="px-4 py-3 text-white/70">{ex.rest_seconds ?? '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(ex)}
                            className="p-2 hover:bg-white/10 rounded-lg transition"
                          >
                            <Pen className="w-4 h-4 text-white/70" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ex.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition group"
                          >
                            <Trash2 className="w-4 h-4 text-red-500/70 group-hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {ex.instructions && (
                      <tr className="bg-white/[0.02]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold">
                {editingId ? 'Egzersizi Düzenle' : 'Yeni Egzersiz Ekle'}
              </h3>
            </div>
            
            <div className="p-6">
              {formError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-sm">
                  {formError}
                </div>
              )}
              
              <form id="exercise-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Egzersiz Adı *</label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Set</label>
                    <input
                      type="text"
                      value={sets}
                      onChange={(e) => setSets(e.target.value)}
                      placeholder="Örn: 3"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tekrar</label>
                    <input
                      type="text"
                      maxLength={40}
                      value={repetitions}
                      onChange={(e) => setRepetitions(e.target.value)}
                      placeholder="Örn: 10-12"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Süre (saniye)</label>
                    <input
                      type="text"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(e.target.value)}
                      placeholder="Örn: 60"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dinlenme (saniye)</label>
                    <input
                      type="text"
                      value={restSeconds}
                      onChange={(e) => setRestSeconds(e.target.value)}
                      placeholder="Örn: 30"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sıra *</label>
                    <input
                      type="text"
                      required
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Talimat</label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                    placeholder="Egzersiz hakkında notlar..."
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={formSaving}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded transition disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                form="exercise-form"
                disabled={formSaving}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition disabled:opacity-50"
              >
                {formSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
