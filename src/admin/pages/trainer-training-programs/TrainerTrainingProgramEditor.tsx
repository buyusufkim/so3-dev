import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import {
  isTrainerTrainingProgramDetail,
  isTrainerTrainingProgramCreateResponse,
  isTrainingProgramStatus,
  isSuccessResponse
} from "./types";

export function TrainerTrainingProgramEditor() {
  const { memberId, programId } = useParams<{ memberId: string; programId?: string }>();
  const navigate = useNavigate();

  const isNew = !programId;
  const canonicalMemberId = memberId || "";
  const canonicalProgramId = programId || null;

  // Validate ID format
  const isValidMemberId = /^[1-9]\d*$/.test(canonicalMemberId);
  const isValidProgramId = isNew ? true : /^[1-9]\d*$/.test(canonicalProgramId || "");
  const isValidParams = isValidMemberId && isValidProgramId;

  const bypassBlocker = useRef(false);
  const isSubmitting = useRef(false);
  const isArchiving = useRef(false);

  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [memberInfo, setMemberInfo] = useState<{ id: number; name: string } | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<{ id: number; name: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    status: "draft" as "draft" | "active" | "archived",
    start_date: "",
    end_date: "",
    notes: ""
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypassBlocker.current && isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinize emin misiniz?")) {
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
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isValidParams) return;
    if (!isNew && canonicalProgramId) {
      fetchProgram();
    }
  }, [canonicalMemberId, canonicalProgramId, isNew, isValidParams]);

  const handleFieldChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    bypassBlocker.current = false;
    setSuccessMessage(null);
  };

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      switch (err.code) {
        case "TRAINER_PROFILE_NOT_LINKED":
          return "Aktif eğitmen profiliniz hesabınıza bağlanmamış.";
        case "NOT_FOUND":
          return "Program veya üye bulunamadı ya da erişim yetkiniz yok.";
        case "FORBIDDEN":
          return "Bu alana erişim yetkiniz yok.";
        case "VALIDATION_ERROR":
          return err.message || "Doğrulama hatası. Lütfen girdiğiniz bilgileri kontrol edin.";
        default:
          return err.message || "Bir hata oluştu.";
      }
    }
    return "Beklenmeyen bir hata oluştu.";
  };

  const fetchProgram = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const data = await apiClient.get(`/api/trainer/training-programs/${canonicalProgramId}`);
      if (!isTrainerTrainingProgramDetail(data)) {
        throw new Error("Antrenman programı verisi doğrulanamadı.");
      }

      // IDOR safety validation: confirm member ID matches URL
      if (data.member.id !== parseInt(canonicalMemberId, 10)) {
        throw new ApiError("Program bu üyeye ait değil veya erişim yetkiniz yok.", 404, "NOT_FOUND");
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
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const title = formData.title.trim();
    if (title.length < 1 || title.length > 160) {
      return "Program başlığı 1 ile 160 karakter arasında olmalıdır.";
    }
    if (!["draft", "active", "archived"].includes(formData.status)) {
      return "Geçersiz durum.";
    }
    if (formData.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.start_date)) {
      return "Geçersiz başlangıç tarihi formatı.";
    }
    if (formData.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.end_date)) {
      return "Geçersiz bitiş tarihi formatı.";
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
      setSuccessMessage(null);

      const payload = {
        title: formData.title.trim(),
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes ? formData.notes.trim() : null
      };

      if (isNew) {
        const res = await apiClient.post(`/api/trainer/members/${canonicalMemberId}/training-programs`, payload);
        if (!isTrainerTrainingProgramCreateResponse(res)) {
          throw new Error("Sunucudan geçersiz yanıt alındı.");
        }
        setIsDirty(false);
        bypassBlocker.current = true;
        navigate(`/admin/my-members/${canonicalMemberId}/training-programs/${res.id}`, { replace: true });
      } else {
        const res = await apiClient.patch(`/api/trainer/training-programs/${canonicalProgramId}`, payload);
        if (!isSuccessResponse(res) || !res.success) {
          throw new Error("Sunucudan geçersiz yanıt alındı.");
        }
        setIsDirty(false);
        bypassBlocker.current = true;
        setSuccessMessage("Program başarıyla güncellendi.");
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
    if (!window.confirm("Bu antrenman programını arşivlemek istediğinize emin misiniz?")) {
      return;
    }

    isArchiving.current = true;
    try {
      setError(null);
      const res = await apiClient.delete(`/api/trainer/training-programs/${canonicalProgramId}`);
      if (!isSuccessResponse(res) || !res.success) {
        throw new Error("Sunucudan geçersiz yanıt alındı.");
      }
      setIsDirty(false);
      bypassBlocker.current = true;
      navigate(`/admin/my-members/${canonicalMemberId}/training-programs`);
    } catch (err: unknown) {
      alert("Arşivlenemedi: " + getErrorMessage(err));
    } finally {
      isArchiving.current = false;
    }
  };

  const handleBack = () => {
    navigate(`/admin/my-members/${canonicalMemberId}/training-programs`);
  };

  if (!isValidParams) {
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
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {isNew ? "Yeni Program Oluştur" : "Program Düzenle"}
            </h2>
            <p className="text-sm text-white/50">
              Antrenman programı detayları ve ayarları
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {!isNew && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Programı Arşivle
            </button>
          )}
          <button
            type="submit"
            form="trainer-program-form"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded text-sm">
          {successMessage}
        </div>
      )}

      <form
        id="trainer-program-form"
        onSubmit={handleSubmit}
        className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-8"
      >
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
            <label className="text-sm font-medium">Program Başlığı *</label>
            <input
              type="text"
              required
              maxLength={160}
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="Örn: 4 Haftalık Güç ve Kondisyon Programı"
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
            placeholder="Program hakkında genel açıklamalar, hedefler veya özel notlar..."
          />
        </div>
      </form>

      {!isNew ? (
        <div className="bg-[#121212] border border-white/10 rounded-lg p-6 text-center text-white/50 text-sm">
          Program egzersiz yönetimi bir sonraki modülde aktif olacaktır.
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg p-6 text-center text-white/50 text-sm">
          Egzersiz eklemek için önce programı kaydedin.
        </div>
      )}
    </div>
  );
}
