import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { X } from "lucide-react";
import { getErrorMessage, useUnsavedChangesWarning } from "./editorUtils";

export interface ContactContent {
  contact_eyebrow: string;
  contact_headline_primary: string;
  contact_headline_emphasis: string;
  directions_cta_label: string;
  consultation_eyebrow: string;
  consultation_headline_primary: string;
  consultation_headline_emphasis: string;
  consultation_intro_primary: string;
  consultation_intro_secondary: string;
}

export function ContactEditor({ onClose, onSaved }: { onClose: () => void, onSaved?: () => void }) {
  const [data, setData] = useState<ContactContent | null>(null);
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
      const res = await apiClient.get('/api/admin/homepage/sections/contact/content');
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

  const handleChange = <K extends keyof ContactContent>(field: K, value: ContactContent[K]) => {
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
      await apiClient.patch('/api/admin/homepage/sections/contact/content', {
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
      <div className="bg-[#111] border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">İletişim Bölümü Sunum Metinleri</h2>
            <p className="text-sm text-white/50 mt-1">Ana sayfa iletişim alanı pazarlama metinlerini düzenleyin.</p>
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
            <div className="space-y-8">
              {/* Group A: İletişim Alanı */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#851C35] uppercase tracking-wider border-b border-white/10 pb-2">A. İletişim Alanı</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1">Üst Etiket</label>
                    <input
                      type="text"
                      value={data.contact_eyebrow}
                      maxLength={80}
                      onChange={(e) => handleChange('contact_eyebrow', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Ana Başlık</label>
                    <input
                      type="text"
                      value={data.contact_headline_primary}
                      maxLength={120}
                      onChange={(e) => handleChange('contact_headline_primary', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Vurgulu Başlık (Kalın)</label>
                    <input
                      type="text"
                      value={data.contact_headline_emphasis}
                      maxLength={120}
                      onChange={(e) => handleChange('contact_headline_emphasis', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1">Yol Tarifi Buton Metni</label>
                    <input
                      type="text"
                      value={data.directions_cta_label}
                      maxLength={80}
                      onChange={(e) => handleChange('directions_cta_label', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                    <p className="text-xs text-white/40 mt-1">Boş bırakılırsa buton gizlenir.</p>
                  </div>
                </div>
              </div>

              {/* Group B: Ön Görüşme Tanıtım Alanı */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#851C35] uppercase tracking-wider border-b border-white/10 pb-2">B. Ön Görüşme Tanıtım Alanı</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1">Üst Etiket</label>
                    <input
                      type="text"
                      value={data.consultation_eyebrow}
                      maxLength={80}
                      onChange={(e) => handleChange('consultation_eyebrow', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Ana Başlık</label>
                    <input
                      type="text"
                      value={data.consultation_headline_primary}
                      maxLength={120}
                      onChange={(e) => handleChange('consultation_headline_primary', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Vurgulu Başlık (Kalın)</label>
                    <input
                      type="text"
                      value={data.consultation_headline_emphasis}
                      maxLength={120}
                      onChange={(e) => handleChange('consultation_headline_emphasis', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1">Ana Açıklama</label>
                    <textarea
                      value={data.consultation_intro_primary}
                      maxLength={400}
                      onChange={(e) => handleChange('consultation_intro_primary', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors min-h-[60px]"
                    />
                    <p className="text-xs text-white/40 mt-1">Boş bırakılırsa gizlenir.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1">İkincil Açıklama</label>
                    <textarea
                      value={data.consultation_intro_secondary}
                      maxLength={400}
                      onChange={(e) => handleChange('consultation_intro_secondary', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#851C35] transition-colors min-h-[60px]"
                    />
                    <p className="text-xs text-white/40 mt-1">Boş bırakılırsa gizlenir.</p>
                  </div>
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
