import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, X, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient, ApiError } from '../../api/client';
import { AdminBranchDetail, BranchMedia } from './types';
import { generateTurkishSlug } from '../../utils/slug';
import { MediaPicker } from '../../components/MediaPicker';

export function AdminBranchEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminRole, setAdminRole] = useState<string>('');

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [coverId, setCoverId] = useState<number | null>(null);
  const [coverObj, setCoverObj] = useState<BranchMedia | null>(null);

  const [gallery, setGallery] = useState<BranchMedia[]>([]);

  const [isSlugManual, setIsSlugManual] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);

  useEffect(() => {
    // Fetch auth for role
    apiClient.get('/api/auth/me').then(res => {
       if (res && (res as any).data) setAdminRole((res as any).data.role);
       else if (res && (res as any).role) setAdminRole((res as any).role);
    }).catch(() => {});

    if (!isNew) {
      fetchBranch();
    }
  }, [id, isNew]);

  const fetchBranch = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/admin/branches/${id}`);
      let b: AdminBranchDetail = (res as any).data || res; // Handle both wrapped and unwrapped just in case
      setName(b.name);
      setSlug(b.slug);
      setDescription(b.description || '');
      setIsActive(b.is_active);
      setCoverId(b.cover?.id || null);
      setCoverObj(b.cover || null);
      setGallery(b.gallery || []);
      
      setIsSlugManual(true); // Don't auto-generate for existing
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/admin/branches', { replace: true });
      } else {
        setError('Branş yüklenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setIsDirty(true);
    if (!isSlugManual && isNew) {
      setSlug(generateTurkishSlug(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val);
    setIsSlugManual(true);
    setIsDirty(true);
  };

  const handleCoverSelect = (media: any) => {
    if (media) {
      setCoverId(media.id);
      setCoverObj(media);
      setIsDirty(true);
    }
    setShowCoverPicker(false);
  };
  
  const handleRemoveCover = () => {
    setCoverId(null);
    setCoverObj(null);
    setIsDirty(true);
  };

  const handleGallerySelect = (media: any) => {
    if (media) {
      if (gallery.length >= 20) {
         alert('Galeriye en fazla 20 görsel eklenebilir.');
         return;
      }
      if (!gallery.some(g => g.id === media.id)) {
        setGallery([...gallery, media]);
        setIsDirty(true);
      }
    }
    setShowGalleryPicker(false);
  };

  const handleRemoveGalleryItem = (index: number) => {
    const newG = [...gallery];
    newG.splice(index, 1);
    setGallery(newG);
    setIsDirty(true);
  };

  const moveGalleryUp = (index: number) => {
    if (index === 0) return;
    const newG = [...gallery];
    const temp = newG[index];
    newG[index] = newG[index - 1];
    newG[index - 1] = temp;
    setGallery(newG);
    setIsDirty(true);
  };

  const moveGalleryDown = (index: number) => {
    if (index === gallery.length - 1) return;
    const newG = [...gallery];
    const temp = newG[index];
    newG[index] = newG[index + 1];
    newG[index + 1] = temp;
    setGallery(newG);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!name || !slug) {
       setError('Branş Adı ve Slug zorunludur.');
       return;
    }

    const payload = {
      name,
      slug,
      description,
      is_active: isActive,
      cover_media_id: coverId === null ? null : Number(coverId),
      gallery_media_ids: gallery.map(g => Number(g.id))
    };

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      if (isNew) {
        await apiClient.post('/api/admin/branches', payload);
        setIsDirty(false);
        navigate('/admin/branches');
      } else {
        await apiClient.patch(`/api/admin/branches/${id}`, payload);
        setIsDirty(false);
        setSuccess('Branş başarıyla güncellendi.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
           setError('Bu slug başka bir branş tarafından kullanılıyor.');
        } else {
           setError(err.message || 'Kaydetme sırasında bir hata oluştu.');
        }
      } else {
        setError('Bir hata oluştu.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu branş yönetim ekranından kaldırılacak.\\nMedya dosyaları silinmeyecek.\\nBu işlemi yapmak istiyor musunuz?')) {
       return;
    }
    try {
      setSaving(true);
      await apiClient.delete(`/api/admin/branches/${id}`);
      setIsDirty(false);
      navigate('/admin/branches');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Silme işlemi başarısız oldu.');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?')) {
      return;
    }
    navigate('/admin/branches');
  };

  if (loading) {
    return <div className="p-8 text-white/50 text-sm">Yükleniyor...</div>;
  }

  const canDelete = !isNew && (adminRole === 'super_admin' || adminRole === 'admin');

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleCancel}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-light text-white mb-1">
              {isNew ? 'Yeni Branş Ekle' : 'Branş Düzenle'}
            </h1>
            <p className="text-sm text-white/50">
              {isNew ? 'Sisteme yeni bir branş ekleyin.' : 'Branş bilgilerini ve görsellerini güncelleyin.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded text-sm font-medium transition disabled:opacity-50"
          >
            İptal
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-white/90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-lg space-y-6">
            <h2 className="text-lg font-medium text-white border-b border-white/10 pb-3">Temel Bilgiler</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Branş Adı</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  maxLength={120}
                  className="w-full bg-[#111] border border-white/10 rounded px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition text-sm"
                  placeholder="Örn: Fitness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Slug (URL)</label>
                <input 
                  type="text" 
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  maxLength={100}
                  className="w-full bg-[#111] border border-white/10 rounded px-4 py-2.5 text-white font-mono focus:outline-none focus:border-white/30 transition text-sm"
                  placeholder="orn-fitness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Açıklama</label>
                <textarea 
                  value={description}
                  onChange={e => { setDescription(e.target.value); setIsDirty(true); }}
                  maxLength={600}
                  rows={4}
                  className="w-full bg-[#111] border border-white/10 rounded px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition text-sm resize-none"
                  placeholder="Branş hakkında kısa açıklama..."
                />
                <div className="text-right mt-1 text-xs text-white/30">{description.length}/600</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/5">
                <div>
                  <div className="text-sm font-medium text-white mb-0.5">Durum</div>
                  <div className="text-xs text-white/50">Bu branş kullanıcılara gösterilsin mi?</div>
                </div>
                <button
                  onClick={() => { setIsActive(!isActive); setIsDirty(true); }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-lg space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-lg font-medium text-white">Galeri ({gallery.length}/20)</h2>
              <button 
                onClick={() => setShowGalleryPicker(true)}
                disabled={gallery.length >= 20}
                className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Görsel Ekle
              </button>
            </div>
            
            {gallery.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded bg-[#111]">
                <p className="text-sm text-white/40">Galeriye henüz görsel eklenmemiş.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {gallery.map((g, index) => (
                  <div key={g.id} className="flex items-center gap-4 p-2 bg-[#111] border border-white/5 rounded">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveGalleryUp(index)} disabled={index === 0} className="text-white/30 hover:text-white disabled:opacity-30 p-1">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveGalleryDown(index)} disabled={index === gallery.length - 1} className="text-white/30 hover:text-white disabled:opacity-30 p-1">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="w-12 h-12 rounded overflow-hidden bg-black flex items-center justify-center border border-white/10 flex-shrink-0">
                      <img src={g.thumbnail_url || g.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/50 truncate">{g.caption || g.alt_text || `Görsel #${g.id}`}</div>
                    </div>
                    <button onClick={() => handleRemoveGalleryItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded transition flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="p-6 bg-[#0a0a0a] border border-white/10 rounded-lg space-y-4">
            <h2 className="text-lg font-medium text-white border-b border-white/10 pb-3">Kapak Görseli</h2>
            
            {coverId && coverObj ? (
              <div className="space-y-3">
                <div className="aspect-[4/3] rounded overflow-hidden bg-[#111] border border-white/10 relative group">
                  <img src={coverObj.thumbnail_url || coverObj.url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCoverPicker(true)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-medium transition">
                    Değiştir
                  </button>
                  <button onClick={handleRemoveCover} className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="aspect-[4/3] rounded border border-dashed border-white/20 bg-[#111] flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-white/40 mb-3">Bu branş için kapak görseli seçilmedi.</p>
                <button onClick={() => setShowCoverPicker(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium transition">
                  Kapak Seç
                </button>
              </div>
            )}
          </div>

          {canDelete && (
            <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-lg space-y-4">
              <h2 className="text-lg font-medium text-red-400 border-b border-red-500/20 pb-3">Tehlikeli Alan</h2>
              <p className="text-xs text-red-400/70">Bu branşı silmek kalıcı bir işlemdir. Kapak ve galeri görselleri silinmez, ancak branş yönetim ekranından kalkar.</p>
              <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition">
                <Trash2 className="w-4 h-4" />
                Branşı Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {showCoverPicker && (
        <MediaPicker
          open={showCoverPicker}
          mode="image"
          onClose={() => setShowCoverPicker(false)}
          onSelect={handleCoverSelect}
          selectedIds={coverId ? [coverId] : undefined}
        />
      )}

      {showGalleryPicker && (
        <MediaPicker
          open={showGalleryPicker}
          mode="image"
          onClose={() => setShowGalleryPicker(false)}
          onSelect={handleGallerySelect}
          selectedIds={gallery.map(g => g.id)}
        />
      )}
    </div>
  );
}
