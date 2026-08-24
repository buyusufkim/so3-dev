import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { TrainingProgramDetail, isTrainingProgramDetail, isTrainingProgramCreateResponse, isTrainingProgramStatus, isSuccessResponse } from "./types";

export function TrainingProgramEditor() {
  const { memberId, programId } = useParams<{ memberId?: string; programId?: string }>();
  const navigate = useNavigate();
  
  const isNew = !programId;
  const canonicalMemberId = isNew ? memberId : null;
  const canonicalProgramId = !isNew ? programId : null;

  // Validate ID format
  const isValidParam = isNew ? /^[1-9]\d*$/.test(canonicalMemberId || "") : /^[1-9]\d*$/.test(canonicalProgramId || "");

  const bypassBlocker = useRef(false);
  const isSubmitting = useRef(false);
  const isArchiving = useRef(false);
  
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [memberInfo, setMemberInfo] = useState<{ id: number; name: string } | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<{ id: number; name: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    status: "draft" as "draft" | "active" | "archived",
    start_date: "",
    end_date: "",
    notes: ""
  });

  useEffect(() => {
    if (!isValidParam) return;
    if (!isNew && canonicalProgramId) {
      fetchProgram();
    }
  }, [canonicalProgramId, isNew, isValidParam]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypassBlocker.current && isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?")) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleFieldChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    bypassBlocker.current = false;
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      switch (err.code) {
        case "MEMBER_TRAINER_NOT_ASSIGNED": return "Üyeye atanmış bir eğitmen bulunmuyor.";
        case "MEMBER_TRAINER_INVALID": return "Üyeye atanmış eğitmen geçersiz veya pasif durumda.";
        case "PROGRAM_NOT_ARCHIVED": return "Bu işlemi yapabilmek için program arşivlenmiş olmalıdır.";
        case "NOT_FOUND": return "Kayıt bulunamadı.";
        case "VALIDATION_ERROR": return err.message || "Doğrulama hatası. Lütfen bilgileri kontrol edin.";
        case "FORBIDDEN": return "Bu işlem için yetkiniz yok.";
        default: return err.message || "Bir hata oluştu.";
      }
    }
    return "Beklenmeyen bir hata oluştu.";
  };

  const fetchProgram = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/admin/training-programs/${canonicalProgramId}`);
      if (!isTrainingProgramDetail(data)) {
        throw new Error("Sunucudan geçersiz veri döndü.");
      }
      
      setFormData({
        title: data.title,
        status: data.status,
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        notes: data.notes || ""
      });
      setMemberInfo({
        id: data.member.id,
        name: `${data.member.first_name} ${data.member.last_name}`
      });
      setTrainerInfo({
        id: data.trainer.id,
        name: data.trainer.name
      });
      setIsDirty(false);
      bypassBlocker.current = false;
      setError(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const title = formData.title.trim();
    if (title.length < 1 || title.length > 160) {
      return "Başlık 1 ile 160 karakter arasında olmalıdır.";
    }
    if (!["draft", "active", "archived"].includes(formData.status)) {
      return "Geçersiz durum.";
    }
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      return "Bitiş tarihi, başlangıç tarihinden önce olamaz.";
    }
    if (formData.notes && Array.from(formData.notes).length > 3000) {
      return "Notlar en fazla 3000 karakter olabilir.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isSubmitting.current) return;
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    isSubmitting.current = true;
    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: formData.title.trim(),
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes || null
      };

      if (isNew) {
        const res = await apiClient.post(`/api/admin/members/${canonicalMemberId}/training-programs`, payload);
        if (!isTrainingProgramCreateResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt.");
        }
        setIsDirty(false);
        bypassBlocker.current = true;
        navigate(`/admin/training-programs/${res.id}`, { replace: true });
      } else {
        const res = await apiClient.patch(`/api/admin/training-programs/${canonicalProgramId}`, payload);
        if (!isSuccessResponse(res) || !res.success) {
          throw new Error("Sunucudan geçersiz yanıt.");
        }
        alert("Program başarıyla güncellendi.");
        setIsDirty(false);
        bypassBlocker.current = true;
        await fetchProgram(); 
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
      isSubmitting.current = false;
    }
  };

  const handleArchive = async () => {
    if (!canonicalProgramId || isArchiving.current) return;
    if (!window.confirm("Bu programı arşivlemek istediğinize emin misiniz?")) {
      return;
    }
    
    isArchiving.current = true;
    try {
      const res = await apiClient.delete(`/api/admin/training-programs/${canonicalProgramId}`);
      if (!isSuccessResponse(res) || !res.success) {
        throw new Error("Sunucudan geçersiz yanıt.");
      }
      setIsDirty(false);
      bypassBlocker.current = true;
      if (memberInfo) {
        navigate(`/admin/members/${memberInfo.id}/training-programs`);
      } else {
        navigate(-1);
      }
    } catch (err: unknown) {
      alert("Arşivlenemedi: " + getErrorMessage(err));
    } finally {
      isArchiving.current = false;
    }
  };

  const handleBack = () => {
    if (isNew && canonicalMemberId) {
      navigate(`/admin/members/${canonicalMemberId}/training-programs`);
    } else if (memberInfo) {
      navigate(`/admin/members/${memberInfo.id}/training-programs`);
    } else {
      navigate(-1);
    }
  };

  if (!isValidParam) {
    return <div className="text-red-500 p-4">Geçersiz parametre.</div>;
  }

  if (loading) {
    return <div className="text-white/50 p-4">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {isNew ? 'Yeni Program Oluştur' : 'Program Düzenle'}
            </h2>
            <p className="text-sm text-white/50">
              Antrenman programı detayları
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {!isNew && (
            <button
              type="button"
              onClick={handleArchive}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded transition"
            >
              <Trash2 className="w-4 h-4" />
              Programı Arşivle
            </button>
          )}
          <button
            type="submit"
            form="program-form"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
          {error}
        </div>
      )}

      <form id="program-form" onSubmit={handleSubmit} className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-8">
        {!isNew && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/10">
            <div className="space-y-1">
              <span className="text-xs text-white/50 uppercase font-medium">Üye</span>
              <div className="text-sm font-medium">{memberInfo?.name || "-"}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-white/50 uppercase font-medium">Eğitmen</span>
              <div className="text-sm font-medium">{trainerInfo?.name || "-"}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Başlık *</label>
            <input
              type="text"
              required
              maxLength={160}
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Durum *</label>
            <select
              value={formData.status}
              onChange={(e) => {
                if (isTrainingProgramStatus(e.target.value)) {
                  handleFieldChange("status", e.target.value);
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="draft">Taslak</option>
              <option value="active">Aktif</option>
              <option value="archived">Tamamlandı/Arşivlendi</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Başlangıç Tarihi</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleFieldChange("start_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bitiş Tarihi</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleFieldChange("end_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notlar</label>
          <textarea
            rows={5}
            maxLength={3000}
            value={formData.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
            placeholder="Program hakkında genel notlar..."
          />
        </div>
      </form>
    </div>
  );
}
