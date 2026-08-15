import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { X, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { getErrorMessage, useUnsavedChangesWarning } from "./editorUtils";

export function BrandBandEditor({ onClose, onSaved }: { onClose: () => void, onSaved?: () => void }) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await apiClient.get('/api/admin/homepage/sections/brand_band/content');
      setItems(res.content.items || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Yükleme başarısız.'));
    } finally {
      setLoading(false);
    }
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
      await apiClient.patch('/api/admin/homepage/sections/brand_band/content', { content: { items } });
      setIsDirty(false);
      alert('Başarıyla kaydedildi.');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    setItems(newItems);
    setIsDirty(true);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    setItems(newItems);
    setIsDirty(true);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setIsDirty(true);
  };

  const updateItem = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index] = val;
    setItems(newItems);
    setIsDirty(true);
  };

  const addItem = () => {
    if (items.length >= 12) return;
    setItems([...items, "Yeni Hizmet"]);
    setIsDirty(true);
  };

  if (loading) return <div className="p-8 text-white/50 animate-pulse">Yükleniyor...</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-lg w-full max-w-2xl my-auto">
        <div className="sticky top-0 bg-[#111] border-b border-white/10 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <div>
            <h2 className="text-lg font-bold text-white">Hizmet Bandı Düzenle</h2>
            <p className="text-xs text-white/50 mt-1">Maksimum 12, Minimum 1 madde eklenebilir.</p>
          </div>
          <button onClick={handleClose} className="p-1 text-white/50 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && <div className="text-red-400 bg-red-500/10 p-3 rounded text-sm mb-4">{error}</div>}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-3 bg-white/5 p-3 rounded border border-white/10">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveUp(index)} disabled={index === 0} className="text-white/30 hover:text-white disabled:opacity-30">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveDown(index)} disabled={index === items.length - 1} className="text-white/30 hover:text-white disabled:opacity-30">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <input 
                  type="text" 
                  maxLength={100}
                  className="flex-1 bg-transparent border-b border-white/10 focus:border-white/40 text-white text-sm py-1 outline-none transition"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                />
                <button onClick={() => removeItem(index)} className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-white/50">Madde Sayısı: {items.length}/12</div>
            <button 
              onClick={addItem}
              disabled={items.length >= 12}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-medium transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Yeni Hizmet Ekle
            </button>
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
