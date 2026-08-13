import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Image as ImageIcon, X, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { MediaPicker } from "../../components/MediaPicker";
import { generateTurkishSlug } from "../../utils/slug";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export function AdminEventEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category_id: '',
    event_date: '',
    location: '',
    excerpt: '',
    content: '',
    status: 'draft',
    featured_on_home: false,
    featured_order: '',
    seo_title: '',
    seo_description: '',
    cover_media_id: null as number | null
  });

  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'image' | 'all'>('image');
  const [pickerTarget, setPickerTarget] = useState<'cover' | 'gallery'>('cover');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await apiClient.get('/api/admin/event-categories');
        setCategories(catRes.data);

        if (!isNew) {
          const res = await apiClient.get(`/api/admin/events/${id}`);
          const ev = res.data;
          setFormData({
            title: ev.title || '',
            slug: ev.slug || '',
            category_id: ev.category_id || '',
            event_date: ev.event_date ? ev.event_date.substring(0, 16).replace(' ', 'T') : '',
            location: ev.location || '',
            excerpt: ev.excerpt || '',
            content: ev.content || '',
            status: ev.status || 'draft',
            featured_on_home: Boolean(ev.featured_on_home),
            featured_order: ev.featured_order ?? '',
            seo_title: ev.seo_title || '',
            seo_description: ev.seo_description || '',
            cover_media_id: ev.cover_media_id || null
          });
          setCoverPreview(ev.cover_thumbnail_url || ev.cover_url || null);
          if (ev.slug) setSlugTouched(true);
          setGallery(ev.gallery || []);
        }
      } catch (err) {
        if (!isNew) alert('Etkinlik bulunamadı.');
        navigate('/admin/events');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isNew, navigate]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleChange = (field: string, value: any) => {
    isDirtyRef.current = true;
    
    if (field === 'slug') {
      setSlugTouched(true);
    }
    
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && !slugTouched) {
        next.slug = generateTurkishSlug(value);
      }
      return next;
    });
  };

  const handleSave = async (redirect = false) => {
    try {
      setSaving(true);
      setErrors({});
      
      const payload = {
        ...formData,
        event_date: formData.event_date ? formData.event_date.replace('T', ' ') + ':00' : null,
        featured_order: formData.featured_order !== '' ? parseInt(formData.featured_order.toString(), 10) : null
      };

      if (isNew) {
        const res = await apiClient.post('/api/admin/events', payload);
        const newId = res.id;
        
        // attach gallery if any
        if (gallery.length > 0) {
          for (const item of gallery) {
            await apiClient.post(`/api/admin/events/${newId}/media`, { media_id: item.id });
          }
          // order them
          const orders = gallery.map((g, i) => ({ media_id: g.id, sort_order: i * 10 }));
          await apiClient.patch(`/api/admin/events/${newId}/media-order`, { orders });
        }

        isDirtyRef.current = false;
        if (redirect) navigate('/admin/events');
        else navigate(`/admin/events/${newId}`, { replace: true });
      } else {
        await apiClient.patch(`/api/admin/events/${id}`, payload);
        isDirtyRef.current = false;
        if (redirect) navigate('/admin/events');
        else alert('Başarıyla kaydedildi.');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrors({ slug: 'Bu URL adresi başka bir etkinlik tarafından kullanılıyor.' });
        } else if (err.status === 422) {
          setErrors({ form: err.message || 'Geçersiz veri.' });
        } else {
          setErrors({ form: err.message || 'Kaydetme başarısız oldu.' });
        }
      } else {
        setErrors({ form: 'Kaydetme başarısız oldu.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = async (media: any) => {
    isDirtyRef.current = true;
    if (pickerTarget === 'cover') {
      handleChange('cover_media_id', media.id);
      setCoverPreview(media.thumbnail_url || media.url);
      setPickerOpen(false);
    } else {
      // Gallery add
      if (gallery.find(g => g.id === media.id)) {
        alert('Bu medya zaten galeride mevcut.');
        return;
      }
      
      if (!isNew) {
        try {
          await apiClient.post(`/api/admin/events/${id}/media`, { media_id: media.id });
          // Reload gallery
          const res = await apiClient.get(`/api/admin/events/${id}`);
          setGallery(res.data.gallery || []);
        } catch(e) {
          alert('Galeriye eklenemedi.');
        }
      } else {
        setGallery(prev => [...prev, media]);
      }
      setPickerOpen(false);
    }
  };

  const handleGalleryRemove = async (mediaId: number) => {
    isDirtyRef.current = true;
    if (!isNew) {
      try {
        await apiClient.delete(`/api/admin/events/${id}/media/${mediaId}`);
        setGallery(prev => prev.filter(g => g.id !== mediaId));
      } catch(e) {
        alert('Galeriden kaldırılamadı.');
      }
    } else {
      setGallery(prev => prev.filter(g => g.id !== mediaId));
    }
  };

  const moveGallery = async (index: number, direction: -1 | 1) => {
    const newGallery = [...gallery];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newGallery.length) return;
    
    const temp = newGallery[index];
    newGallery[index] = newGallery[targetIndex];
    newGallery[targetIndex] = temp;
    
    setGallery(newGallery);
    isDirtyRef.current = true;

    if (!isNew) {
      try {
        const orders = newGallery.map((g, i) => ({ media_id: g.id, sort_order: i * 10 }));
        await apiClient.patch(`/api/admin/events/${id}/media-order`, { orders });
      } catch(e) {
        // Sıralama kaydedilemedi
      }
    }
  };

  if (loading) {
    return <div className="text-white/50 text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/admin/events')} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-semibold text-white">{isNew ? 'Yeni Etkinlik' : 'Etkinliği Düzenle'}</h2>
        </div>
        <div className="flex space-x-2">
          <button 
            disabled={saving}
            onClick={() => handleSave(true)}
            className="px-4 py-2 border border-white/20 text-white rounded text-sm hover:bg-white/10 transition disabled:opacity-50"
          >
            Kaydet ve Listeye Dön
          </button>
          <button 
            disabled={saving}
            onClick={() => handleSave(false)}
            className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-white/90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </div>

      {errors.form && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded text-sm text-center">
          {errors.form}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">Genel Bilgiler</h3>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Başlık *</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">URL (Slug) *</label>
              <input 
                type="text" 
                value={formData.slug}
                onChange={e => handleChange('slug', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 font-mono text-sm"
              />
              {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Kategori *</label>
                <select 
                  value={formData.category_id}
                  onChange={e => handleChange('category_id', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 appearance-none"
                >
                  <option value="">Seçiniz...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tarih</label>
                <input 
                  type="datetime-local" 
                  value={formData.event_date}
                  onChange={e => handleChange('event_date', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Konum</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={e => handleChange('location', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">İçerik</h3>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Kısa Açıklama</label>
              <textarea 
                rows={3}
                value={formData.excerpt}
                onChange={e => handleChange('excerpt', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Detaylı İçerik (Markdown/HTML)</label>
              <textarea 
                rows={10}
                value={formData.content}
                onChange={e => handleChange('content', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 font-mono text-sm"
              />
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Galeri</h3>
              <button 
                onClick={() => { setPickerMode('all'); setPickerTarget('gallery'); setPickerOpen(true); }}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition"
              >
                Medya Ekle
              </button>
            </div>
            
            {gallery.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm border-2 border-dashed border-white/10 rounded">
                Henüz galeri medyası eklenmemiş.
              </div>
            ) : (
              <div className="space-y-2">
                {gallery.map((g, idx) => (
                  <div key={g.id} className="flex items-center justify-between p-2 bg-black/20 border border-white/10 rounded group">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-black/50 rounded overflow-hidden">
                        {g.media_type === 'image' ? (
                          <img src={g.thumbnail_url || g.url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">VID</div>
                        )}
                      </div>
                      <span className="text-sm truncate w-32 sm:w-48 text-white/70">{g.original_name || 'Medya'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => moveGallery(idx, -1)} disabled={idx === 0} className="p-1 text-white/30 hover:text-white disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => moveGallery(idx, 1)} disabled={idx === gallery.length - 1} className="p-1 text-white/30 hover:text-white disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                      <button onClick={() => handleGalleryRemove(g.id)} className="p-1 text-red-400/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">Kapak Görseli</h3>
            {coverPreview ? (
              <div className="relative group rounded overflow-hidden border border-white/10">
                <img src={coverPreview} alt="Kapak" className="w-full h-auto" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setPickerMode('image'); setPickerTarget('cover'); setPickerOpen(true); }}
                    className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-white/90"
                  >
                    Değiştir
                  </button>
                  <button 
                    onClick={() => { handleChange('cover_media_id', null); setCoverPreview(null); }}
                    className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => { setPickerMode('image'); setPickerTarget('cover'); setPickerOpen(true); }}
                className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition"
              >
                <ImageIcon className="w-8 h-8 text-white/30 mb-2" />
                <span className="text-sm text-white/50">Kapak görseli seç</span>
              </div>
            )}
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">Yayın & Vitrin</h3>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Durum</label>
              <select 
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 appearance-none"
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
                <option value="archived">Arşivde</option>
              </select>
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.featured_on_home}
                  onChange={e => handleChange('featured_on_home', e.target.checked)}
                  disabled={formData.status !== 'published'}
                  className="w-4 h-4 bg-black/20 border-white/20 rounded focus:ring-white/30 accent-white"
                />
                <span className={`text-sm font-medium ${formData.status === 'published' ? 'text-white' : 'text-white/50'}`}>Ana Sayfada Vitrinde Göster</span>
              </label>
              {formData.status !== 'published' && (
                <p className="text-[10px] text-white/40 mt-1 ml-7">Yalnızca yayındaki etkinlikler vitrinde gösterilebilir.</p>
              )}
            </div>

            {formData.featured_on_home && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Vitrin Sırası</label>
                <input 
                  type="number" 
                  min="0"
                  max="10000"
                  value={formData.featured_order}
                  onChange={e => handleChange('featured_order', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30"
                  placeholder="Opsiyonel (0-10000)"
                />
              </div>
            )}
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">SEO</h3>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">SEO Başlığı</label>
              <input 
                type="text" 
                value={formData.seo_title}
                onChange={e => handleChange('seo_title', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">SEO Açıklaması</label>
              <textarea 
                rows={3}
                value={formData.seo_description}
                onChange={e => handleChange('seo_description', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-white/30 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      <MediaPicker 
        open={pickerOpen} 
        onClose={() => setPickerOpen(false)} 
        onSelect={handleMediaSelect}
        mode={pickerMode}
        selectedIds={pickerTarget === "cover" ? (formData.cover_media_id ? [formData.cover_media_id] : []) : gallery.map(g => g.id)}
      />
    </div>
  );
}
