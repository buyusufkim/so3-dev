import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { X } from "lucide-react";

export function AboutEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await apiClient.get('/api/admin/homepage/sections/about/content');
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
      await apiClient.patch('/api/admin/homepage/sections/about/content', { content: data });
      setIsDirty(false);
      alert('Başarıyla kaydedildi.');
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
          <h2 className="text-lg font-bold text-white">Hakkımızda Düzenle</h2>
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
                <label className="block text-xs text-white/50 mb-1">Başlık</label>
                <input type="text" maxLength={120} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_primary || ''} onChange={e => handleChange('headline_primary', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Vurgulu Başlık</label>
                <input type="text" maxLength={120} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_emphasis || ''} onChange={e => handleChange('headline_emphasis', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Birinci Paragraf</label>
              <textarea rows={4} maxLength={1200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"
                value={data.paragraph_primary || ''} onChange={e => handleChange('paragraph_primary', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">İkinci Paragraf</label>
              <textarea rows={4} maxLength={1200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"
                value={data.paragraph_secondary || ''} onChange={e => handleChange('paragraph_secondary', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">YouTube Video ID</label>
                <input type="text" maxLength={20} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.youtube_video_id || ''} onChange={e => handleChange('youtube_video_id', e.target.value)} placeholder="0ojUK4qD8yE" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Video Başlığı</label>
                <input type="text" maxLength={120} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.youtube_title || ''} onChange={e => handleChange('youtube_title', e.target.value)} />
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
    </div>
  );
}
