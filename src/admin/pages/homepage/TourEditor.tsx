import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { X } from "lucide-react";
import { getErrorMessage, useUnsavedChangesWarning } from "./editorUtils";

export interface TourContent {
  eyebrow: string;
  headline: string;
  intro: string;
}

export function TourEditor({ onClose, onSaved }: { onClose: () => void, onSaved?: () => void }) {
  const [data, setData] = useState<TourContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await apiClient.get('/api/admin/homepage/sections/tour/content');
      setData(res.content);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Yükleme başarısız.'));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === 'object' && 'message' in err) {
      return String(err.message);
    }
    return fallback;
  };

  const handleChange = <K extends keyof TourContent>(field: K, value: TourContent[K]) => {
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
      await apiClient.patch('/api/admin/homepage/sections/tour/content', {
        content: data
      });
      setIsDirty(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Kayıt başarısız.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Sanal Tur Bölümü Sunum Metinleri</h2>
            <p className="text-sm text-white/50 mt-1">Ana sayfa sanal tur alanı başlıklarını ve etiketlerini düzenleyin.</p>
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
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/10 pb-2">Metin İçerikleri</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Üst Etiket (Eyebrow)</label>
                  <input
                    type="text"
                    value={data.eyebrow}
                    maxLength={80}
                    onChange={(e) => handleChange('eyebrow', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={data.headline}
                    maxLength={160}
                    onChange={(e) => handleChange('headline', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Açıklama</label>
                  <textarea
                    value={data.intro}
                    maxLength={300}
                    onChange={(e) => handleChange('intro', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors min-h-[80px]"
                  />
                  <p className="text-xs text-white/40 mt-1">Zorunlu değildir. Boş bırakırsanız açıklama paragrafı gizlenir.</p>
                </div>
              </div>
            </div>
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
  );
}
