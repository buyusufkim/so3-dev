import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { MediaPicker } from "../../components/MediaPicker";
import { X, Image as ImageIcon } from "lucide-react";
import { getErrorMessage, useUnsavedChangesWarning } from "./editorUtils";
import { type HomepageMediaInfo } from "./HeroEditor";

export interface PerformanceContent {
  headline_primary: string;
  headline_emphasis: string;
  description: string;
  background_media_id: number | null;
}

export function PerformanceEditor({ onClose, onSaved }: { onClose: () => void, onSaved?: () => void }) {
  const [data, setData] = useState<PerformanceContent | null>(null);
  const [mediaPreview, setMediaPreview] = useState<HomepageMediaInfo | null>(null);
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
      const res = await apiClient.get('/api/admin/homepage/sections/performance/content');
      setData(res.content);
      if (res.media?.background) {
        setMediaPreview(res.media.background);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Yükleme başarısız.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = <K extends keyof PerformanceContent>(field: K, value: PerformanceContent[K]) => {
    setData((prev) => prev ? { ...prev, [field]: value } : null);
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!data) return;
    try {
      setSaving(true);
      setError(null);
      await apiClient.patch('/api/admin/homepage/sections/performance/content', {
        content: data
      });
      setIsDirty(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Kayıt başarısız.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = (selected: { id: number; url: string; thumbnail_url: string | null; media_type: 'image' | 'video'; original_name: string; alt_text: string | null }) => {
    if (selected) {
      handleChange('background_media_id', selected.id);
      setMediaPreview({
        id: selected.id,
        url: selected.url,
        thumbnail_url: selected.thumbnail_url || selected.url,
        alt_text: selected.alt_text
      });
    }
    setMediaPickerOpen(false);
  };

  const handleRemoveMedia = () => {
    handleChange('background_media_id', null);
    setMediaPreview(null);
  };

  if (loading) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">Performans Bölümü</h2>
              <p className="text-sm text-white/50 mt-1">Ana sayfa performans alanı içeriğini düzenleyin.</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white/50 hover:text-white" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {data && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/10 pb-2">Ana Metinler</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Ana Başlık</label>
                      <input
                        type="text"
                        value={data.headline_primary}
                        onChange={(e) => handleChange('headline_primary', e.target.value)}
                        maxLength={140} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Vurgulu Başlık</label>
                      <input
                        type="text"
                        value={data.headline_emphasis}
                        onChange={(e) => handleChange('headline_emphasis', e.target.value)}
                        maxLength={140} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Açıklama</label>
                      <textarea
                        value={data.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={3}
                        maxLength={500} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/10 pb-2">Arka Plan Görseli</h3>
                  
                  <div className="flex flex-col gap-4">
                    {mediaPreview ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 group bg-black">
                        <img src={mediaPreview.thumbnail_url || mediaPreview.url} alt={mediaPreview.alt_text || "Background preview"} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button onClick={() => setMediaPickerOpen(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded font-medium text-sm transition backdrop-blur-sm">Değiştir</button>
                          <button onClick={handleRemoveMedia} className="px-4 py-2 bg-red-500/40 hover:bg-red-500/60 text-white rounded font-medium text-sm transition backdrop-blur-sm">Kaldır</button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setMediaPickerOpen(true)}
                        className="w-full aspect-video rounded-lg border-2 border-dashed border-white/10 hover:border-white/30 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-white/5 hover:bg-white/10 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-6 h-6 text-white/40" />
                        </div>
                        <span className="text-sm font-medium text-white/50 group-hover:text-white/70">Görsel Seç</span>
                      </div>
                    )}
                    <p className="text-xs text-white/40">Zorunlu değildir. Boş bırakılırsa koyu arka plan tasarımı uygulanır.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0A0A0A] rounded-b-xl">
            <button
              onClick={handleClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg font-medium text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isDirty 
                  ? 'bg-[#851C35] text-white hover:bg-[#9A203E]' 
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </div>

      {mediaPickerOpen && (
        <MediaPicker
          open={mediaPickerOpen}
          mode="image"
          selectedIds={data?.background_media_id ? [data.background_media_id] : []}
          onSelect={handleMediaSelect}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}
    </>
  );
}
