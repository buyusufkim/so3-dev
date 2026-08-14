import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Trash2, X, Image as ImageIcon } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { generateTurkishSlug } from "../../utils/slug";
import { AdminTrainerDetail, TrainerBranch, AdminUser } from "./types";
import { MediaPicker } from "../../components/MediaPicker";

interface TrainerFormData {
  name: string;
  slug: string;
  role_title: string;
  branch_id: number;
  bio: string;
  instagram_username: string;
  profile_media_id: number | null;
  is_active: boolean;
}

export function AdminTrainerEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!isNew);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [branches, setBranches] = useState<TrainerBranch[]>([]);

  // Media Picker state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  
  // Trainer preview state
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<TrainerFormData>({
    name: "",
    slug: "",
    role_title: "",
    branch_id: 0,
    bio: "",
    instagram_username: "",
    profile_media_id: null,
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
    fetchAdmin();
    if (!isNew) {
      fetchTrainer();
    }
  }, [id]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const fetchBranches = async () => {
    try {
      const data = await apiClient.get('/api/admin/branches') as TrainerBranch[];
      setBranches(data);
    } catch (err) {
      console.error("Branşlar yüklenemedi", err);
    }
  };

  const fetchAdmin = async () => {
    try {
      const data = await apiClient.get('/api/auth/me') as AdminUser;
      setAdmin(data);
    } catch (err) {
      console.error("Admin bilgisi alınamadı", err);
    }
  };

  const fetchTrainer = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/admin/trainers/${id}`) as AdminTrainerDetail;
      setFormData({
        name: data.name,
        slug: data.slug,
        role_title: data.role_title,
        branch_id: data.branch.id,
        bio: data.bio || "",
        instagram_username: data.instagram_username || "",
        profile_media_id: data.profile ? data.profile.id : null,
        is_active: data.is_active
      });
      if (data.profile) {
        setProfilePreviewUrl(data.profile.thumbnail_url || data.profile.url);
      }
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/admin/trainers');
      } else {
        setError("Eğitmen yüklenirken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: any = value;
    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'branch_id') {
      parsedValue = parseInt(value, 10) || 0;
    }

    setFormData(prev => {
      const next = { ...prev, [name]: parsedValue };
      
      // Auto-generate slug if name changes and slug hasn't been manually edited (and it's new)
      if (name === 'name' && !slugManuallyEdited && isNew) {
        next.slug = generateTurkishSlug(value);
      }
      
      return next;
    });
    
    if (name === 'slug') {
      setSlugManuallyEdited(true);
    }
    
    setIsDirty(true);
    setSuccessMsg(null);
  };

  const handleMediaSelect = (media: any) => {
    setFormData(prev => ({ ...prev, profile_media_id: media.id }));
    setProfilePreviewUrl(media.thumbnail_url || media.url);
    setIsDirty(true);
    setSuccessMsg(null);
    setMediaPickerOpen(false);
  };

  const handleRemoveProfile = () => {
    setFormData(prev => ({ ...prev, profile_media_id: null }));
    setProfilePreviewUrl(null);
    setIsDirty(true);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        name: formData.name,
        slug: formData.slug,
        role_title: formData.role_title,
        branch_id: formData.branch_id,
        bio: formData.bio.trim() === "" ? null : formData.bio.trim(),
        instagram_username: formData.instagram_username.trim() === "" ? null : formData.instagram_username.trim().replace(/^@/, ''),
        profile_media_id: formData.profile_media_id,
        is_active: formData.is_active
      };

      if (isNew) {
        await apiClient.post('/api/admin/trainers', payload);
        setIsDirty(false);
        navigate('/admin/trainers');
      } else {
        await apiClient.patch(`/api/admin/trainers/${id}`, payload);
        setIsDirty(false);
        setSuccessMsg("Değişiklikler kaydedildi.");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("Bu slug başka bir eğitmen tarafından kullanılıyor.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Kaydedilirken bir hata oluştu.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bu eğitmen yönetim ekranından kaldırılacak.\nProfil medya dosyası silinmeyecek.\nBu işlemi yapmak istiyor musunuz?")) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.delete(`/api/admin/trainers/${id}`);
      setIsDirty(false);
      navigate('/admin/trainers');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          alert("Bu işlem için yetkiniz yok.");
        } else {
          alert("Silinirken bir hata oluştu: " + err.message);
        }
      } else {
        alert("Silinirken bir hata oluştu.");
      }
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm("Kaydedilmemiş değişiklikleriniz var.\nÇıkmak istediğinize emin misiniz?")) {
        return;
      }
    }
    navigate('/admin/trainers');
  };

  if (loading) {
    return <div className="text-white/50">Yükleniyor...</div>;
  }

  const canDelete = admin?.role === 'super_admin' || admin?.role === 'admin';

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleCancel}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {isNew ? 'Yeni Eğitmen' : 'Eğitmeni Düzenle'}
            </h2>
            <p className="text-sm text-white/50">
              Eğitmen bilgilerini girin veya güncelleyin.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium rounded transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Eğitmeni Sil
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 text-sm font-medium rounded transition disabled:opacity-50"
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

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded text-sm">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-6">
            <h3 className="text-sm font-medium border-b border-white/10 pb-4">Temel Bilgiler</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={120}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 transition"
                  placeholder="Örn: Selami Özyıldırım"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  maxLength={120}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 transition"
                  placeholder="orn-selami-ozyildirim"
                  required
                />
                <p className="text-xs text-white/40 mt-1">Sadece küçük harf, rakam ve tire içerebilir. URL'de kullanılır.</p>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Görev / Ünvan</label>
                <input
                  type="text"
                  name="role_title"
                  value={formData.role_title}
                  onChange={handleChange}
                  maxLength={160}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 transition"
                  placeholder="Örn: Fitness Eğitmeni"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Biyografi</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  maxLength={1200}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 transition resize-none"
                  placeholder="Eğitmen hakkında kısa bilgi..."
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-white/40">Zorunlu değil.</p>
                  <p className="text-xs text-white/40">{formData.bio.length} / 1200</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-6">
            <h3 className="text-sm font-medium border-b border-white/10 pb-4">Organizasyon</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Branş</label>
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 transition"
                  required
                >
                  <option value={0} disabled>Branş Seçin</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} {!b.is_active && '(Pasif)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Durum</label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-emerald-500' : 'bg-white/10'}`}></div>
                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="text-sm font-medium">
                    {formData.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-6">
            <h3 className="text-sm font-medium border-b border-white/10 pb-4">Profil Görseli</h3>
            
            <div className="space-y-4">
              {profilePreviewUrl ? (
                <div className="relative group">
                  <img 
                    src={profilePreviewUrl} 
                    alt="Profil Önizleme" 
                    className="w-full aspect-square object-cover rounded bg-white/5 border border-white/10"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded">
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(true)}
                      className="px-4 py-2 bg-white text-black text-xs font-medium rounded hover:bg-white/90"
                    >
                      Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveProfile}
                      className="px-4 py-2 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="w-full aspect-square border-2 border-dashed border-white/10 rounded flex flex-col items-center justify-center gap-2 hover:border-white/30 hover:bg-white/5 transition"
                >
                  <ImageIcon className="w-8 h-8 text-white/30" />
                  <span className="text-sm text-white/50">Profil Fotoğrafı Seç</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-lg p-6 space-y-6">
            <h3 className="text-sm font-medium border-b border-white/10 pb-4">Sosyal Medya</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Instagram Kullanıcı Adı</label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-white/40">@</span>
                  <input
                    type="text"
                    name="instagram_username"
                    value={formData.instagram_username}
                    onChange={handleChange}
                    maxLength={80}
                    className="w-full bg-white/5 border border-white/10 rounded pl-8 pr-4 py-2 text-white focus:outline-none focus:border-white/30 transition"
                    placeholder="kullaniciadi"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {mediaPickerOpen && (
        <MediaPicker
          open={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={handleMediaSelect}
          mode="image"
          selectedIds={formData.profile_media_id ? [formData.profile_media_id] : []}
        />
      )}
    </div>
  );
}
