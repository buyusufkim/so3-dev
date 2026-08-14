import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { X, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

export interface ProcessStep {
  title: string;
}

export interface ProcessContent {
  eyebrow?: string;
  headline_primary?: string;
  headline_emphasis?: string;
  steps?: ProcessStep[];
}

export function ProcessEditor({ onClose, onSaved }: { onClose: () => void, onSaved?: () => void }) {
  const [data, setData] = useState<ProcessContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await apiClient.get('/api/admin/homepage/sections/process/content');
      setData(res.content);
    } catch (err: any) {
      setError(err.message || 'Yükleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof ProcessContent, value: string) => {
    setData((prev) => prev ? { ...prev, [field]: value } : null);
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
      await apiClient.patch('/api/admin/homepage/sections/process/content', { content: data });
      setIsDirty(false);
      alert('Başarıyla kaydedildi.');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0 || !data?.steps) return;
    const newSteps = [...data.steps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    setData({ ...data, steps: newSteps });
    setIsDirty(true);
  };

  const moveDown = (index: number) => {
    if (!data?.steps || index === data.steps.length - 1) return;
    const newSteps = [...data.steps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    setData({ ...data, steps: newSteps });
    setIsDirty(true);
  };

  const removeStep = (index: number) => {
    if (!data?.steps) return;
    const newSteps = data.steps.filter((_, i) => i !== index);
    setData({ ...data, steps: newSteps });
    setIsDirty(true);
  };

  const updateStep = (index: number, val: string) => {
    if (!data?.steps) return;
    const newSteps = [...data.steps];
    newSteps[index] = { ...newSteps[index], title: val };
    setData({ ...data, steps: newSteps });
    setIsDirty(true);
  };

  const addStep = () => {
    if (!data || !data.steps || data.steps.length >= 8) return;
    setData({ ...data, steps: [...data.steps, { title: "Yeni Adım" }] });
    setIsDirty(true);
  };

  if (loading) return <div className="p-8 text-white/50 animate-pulse">Yükleniyor...</div>;
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-2xl my-auto">
        <div className="sticky top-0 bg-[#111] border-b border-white/10 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <h2 className="text-lg font-bold text-white">Nasıl Çalışır Düzenle</h2>
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
                value={data.eyebrow || ''} onChange={e => handleFieldChange('eyebrow', e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Ana Başlık</label>
                <input type="text" maxLength={140} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_primary || ''} onChange={e => handleFieldChange('headline_primary', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Vurgulu Başlık</label>
                <input type="text" maxLength={140} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_emphasis || ''} onChange={e => handleFieldChange('headline_emphasis', e.target.value)} />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mt-2">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs text-white/50">Adımlar (Min: 1, Max: 8)</label>
              </div>

              <div className="space-y-4">
                {data.steps?.map((step, index) => (
                  <div key={index} className="flex gap-3 bg-white/5 p-4 rounded border border-white/10 items-center">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveUp(index)} disabled={index === 0} className="text-white/30 hover:text-white disabled:opacity-30">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveDown(index)} disabled={index === (data.steps?.length ?? 0) - 1} className="text-white/30 hover:text-white disabled:opacity-30">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center bg-[#851C35] rounded-full text-white text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        maxLength={180}
                        className="w-full bg-transparent border-b border-white/10 focus:border-white/40 text-white text-sm py-2 outline-none transition"
                        value={step.title}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder="Adım Metni"
                      />
                    </div>
                    <div>
                      <button onClick={() => removeStep(index)} className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-white/50">Adım Sayısı: {data.steps?.length || 0}/8</div>
                <button 
                  onClick={addStep}
                  disabled={(data.steps?.length || 0) >= 8}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-medium transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Adım Ekle
                </button>
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
