import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { MediaPicker } from "../../components/MediaPicker";
import { X, Image as ImageIcon } from "lucide-react";
import { MediaAsset } from "../../pages/Media"; // Ensure MediaAsset is exported there, wait, check types.

export function HeroEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await apiClient.get('/api/admin/homepage/sections/hero/content');
      setData(res.content);
    } catch (err: any) {
      setError(err.message || 'Yükleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("Kaydedilmemiş değişiklikler var. Kapatmak istediğinize emin misiniz?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiClient.patch('/api/admin/homepage/sections/hero/content', { content: data });
      setIsDirty(false);
      alert('Başarıyla kaydedildi.'); // restrained success feedback
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-white/50 animate-pulse">Yükleniyor...</div>;
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-2xl my-auto">
        <div className="sticky top-0 bg-[#111] border-b border-white/10 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <h2 className="text-lg font-bold text-white">Hero Düzenle</h2>
          <button onClick={handleClose} className="p-1 text-white/50 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && <div className="text-red-400 bg-red-500/10 p-3 rounded text-sm">{error}</div>}

          <div className="grid gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Üst Etiket</label>
              <input type="text" maxLength={80} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                value={data.eyebrow || ''} onChange={e => handleChange('eyebrow', e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Ana Başlık</label>
                <input type="text" maxLength={100} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_primary || ''} onChange={e => handleChange('headline_primary', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Vurgulu Başlık</label>
                <input type="text" maxLength={100} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_emphasis || ''} onChange={e => handleChange('headline_emphasis', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Destek Metni</label>
              <input type="text" maxLength={180} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                value={data.support_text || ''} onChange={e => handleChange('support_text', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Özellik 1</label>
                <input type="text" maxLength={80} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.feature_left || ''} onChange={e => handleChange('feature_left', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Özellik 2</label>
                <input type="text" maxLength={80} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.feature_right || ''} onChange={e => handleChange('feature_right', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Birincil Buton</label>
                <input type="text" maxLength={60} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.primary_cta_label || ''} onChange={e => handleChange('primary_cta_label', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Birincil Buton Hedefi</label>
                <input type="text" maxLength={200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.primary_cta_target || ''} onChange={e => handleChange('primary_cta_target', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">İkincil Buton</label>
                <input type="text" maxLength={60} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.secondary_cta_label || ''} onChange={e => handleChange('secondary_cta_label', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">İkincil Buton Hedefi</label>
                <input type="text" maxLength={200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.secondary_cta_target || ''} onChange={e => handleChange('secondary_cta_target', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-2">Arka Plan Görseli</label>
              <div className="flex items-center gap-4">
                {data.background_media_id ? (
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded border border-white/10 w-full">
                    <div className="text-sm text-white/80">Medya ID: {data.background_media_id}</div>
                    <div className="flex gap-2 ml-auto">
                      <button onClick={() => setMediaPickerOpen(true)} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition">Görsel Seç</button>
                      <button onClick={() => handleChange('background_media_id', null)} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition">Görseli Kaldır</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setMediaPickerOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 transition">
                    <ImageIcon className="w-4 h-4" />
                    Görsel Seç
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 flex justify-end gap-3 rounded-b-lg bg-[#111]">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-white/60 hover:text-white transition">İptal</button>
          <button 
            onClick={handleSave} 
            disabled={saving || !isDirty}
            className="px-4 py-2 text-sm font-medium bg-[#851C35] text-white rounded hover:bg-[#9A203E] disabled:opacity-50 transition"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      <MediaPicker 
        open={mediaPickerOpen} 
        mode="image"
        onClose={() => setMediaPickerOpen(false)} 
        onSelect={(media) => {
          handleChange('background_media_id', media.id);
          setMediaPickerOpen(false);
        }} 
      />
    </div>
  );
}
