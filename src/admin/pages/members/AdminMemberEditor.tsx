import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { ArrowLeft, Save, Trash2, TrendingUp } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { Member } from "./types";
import { AdminTrainerListItem } from "../trainers/types";

export function AdminMemberEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const bypassBlocker = useRef(false);
  const isSubmitting = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [initialConsent, setInitialConsent] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    status: "active" as "active" | "inactive",
    trainer_id: "",
    membership_start_date: "",
    membership_end_date: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    consent_given: false
  });

  useEffect(() => {
    fetchTrainers();
    if (!isNew) {
      fetchMember();
    }
  }, [id]);

  // Prompt before leaving if there are unsaved changes
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

  const fetchTrainers = async () => {
    try {
      const data = await apiClient.get('/api/admin/trainers?status=active') as AdminTrainerListItem[];
      setTrainers(data);
    } catch (err) {
      console.error("Eğitmenler yüklenemedi", err);
    }
  };

  const fetchMember = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/admin/members/${id}`) as Member;
      
      setInitialConsent(data.consent_given_at || null);
      
      setFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email || "",
        status: data.status,
        trainer_id: data.trainer?.id?.toString() || "",
        membership_start_date: data.membership_start_date || "",
        membership_end_date: data.membership_end_date || "",
        emergency_contact_name: data.emergency_contact_name || "",
        emergency_contact_phone: data.emergency_contact_phone || "",
        notes: data.notes || "",
        consent_given: !!data.consent_given_at
      });
      setIsDirty(false);
      bypassBlocker.current = false;
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Üye yüklenirken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      setSaving(true);
      setError(null);

      // Prepare payload
      let consentVal: string | null = null;
      if (formData.consent_given) {
         if (initialConsent) {
             consentVal = initialConsent; // Preserve existing
         } else {
             // Generate current local YYYY-MM-DD HH:mm:ss
             const now = new Date();
             const pad = (n: number) => n.toString().padStart(2, '0');
             consentVal = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
         }
      }

      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email || null,
        status: formData.status,
        trainer_id: formData.trainer_id ? parseInt(formData.trainer_id, 10) : null,
        membership_start_date: formData.membership_start_date || null,
        membership_end_date: formData.membership_end_date || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        notes: formData.notes || null,
        consent_given_at: consentVal
      };

      if (isNew) {
        const res = await apiClient.post('/api/admin/members', payload) as { id: number };
        setIsDirty(false);
        bypassBlocker.current = true;
        navigate(`/admin/members/${res.id}`);
      } else {
        await apiClient.patch(`/api/admin/members/${id}`, payload);
        alert("Üye başarıyla güncellendi.");
        setIsDirty(false);
        bypassBlocker.current = true;
        // Refresh to update initialConsent if it was just granted
        fetchMember(); 
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Kaydedilirken bir hata oluştu.");
      }
    } finally {
      setSaving(false);
      isSubmitting.current = false;
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    if (!window.confirm("Bu üyeyi arşivlemek istediğinize emin misiniz? Kayıt arşiv listesine taşınacaktır.")) {
      return;
    }
    
    try {
      await apiClient.delete(`/api/admin/members/${id}`);
      setIsDirty(false);
      bypassBlocker.current = true;
      navigate('/admin/members');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert("Arşivlenemedi: " + err.message);
      } else {
        alert("Arşivlenirken bir hata oluştu.");
      }
    }
  };

  if (loading) {
    return <div className="text-white/50">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/members')}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {isNew ? 'Yeni Üye Ekle' : 'Üye Düzenle'}
            </h2>
            <p className="text-sm text-white/50">
              Üye bilgilerini eksiksiz doldurun.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/admin/members/${id}/training-programs`)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded transition"
              >
                Antrenman Programları
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded transition"
              >
                <Trash2 className="w-4 h-4" />
                Arşivle
              </button>
            </>
          )}
          <button
            type="submit"
            form="member-form"
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

      <form id="member-form" onSubmit={handleSubmit} className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ad *</label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => handleFieldChange("first_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Soyad *</label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => handleFieldChange("last_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefon *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">E-posta</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Durum *</label>
            <select
              value={formData.status}
              onChange={(e) => handleFieldChange("status", e.target.value as "active" | "inactive")}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Atanmış Eğitmen</label>
            <select
              value={formData.trainer_id}
              onChange={(e) => handleFieldChange("trainer_id", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="">Seçiniz...</option>
              {trainers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Üyelik Başlangıç</label>
            <input
              type="date"
              value={formData.membership_start_date}
              onChange={(e) => handleFieldChange("membership_start_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Üyelik Bitiş</label>
            <input
              type="date"
              value={formData.membership_end_date}
              onChange={(e) => handleFieldChange("membership_end_date", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Acil Durum Kişisi</label>
            <input
              type="text"
              value={formData.emergency_contact_name}
              onChange={(e) => handleFieldChange("emergency_contact_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Acil Durum Telefonu</label>
            <input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => handleFieldChange("emergency_contact_phone", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notlar</label>
          <textarea
            rows={4}
            value={formData.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
            placeholder="Üye ile ilgili genel notlar..."
          />
        </div>

        <div className="flex items-center gap-3 py-4 border-t border-white/10">
          <input
            type="checkbox"
            id="consent"
            checked={formData.consent_given}
            onChange={(e) => handleFieldChange("consent_given", e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-0"
          />
          <label htmlFor="consent" className="text-sm text-white/70">
            Açık rıza / Veri işleme onayı alındı
            {initialConsent && formData.consent_given && (
               <span className="ml-2 text-xs text-white/40">(Onay Tarihi: {initialConsent})</span>
            )}
          </label>
        </div>

      </form>
    </div>
  );
}
