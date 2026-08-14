import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { MoveUp, MoveDown, Eye, EyeOff, Save, Edit2 } from "lucide-react";
import { HeroEditor } from "./homepage/HeroEditor";
import { BrandBandEditor } from "./homepage/BrandBandEditor";
import { AboutEditor } from "./homepage/AboutEditor";
import { WhySo3Editor } from "./homepage/WhySo3Editor";
import { ProcessEditor } from "./homepage/ProcessEditor";


type HomepageSection = {
  section_id: string;
  is_active: number;
  sort_order: number;
  updated_at: string | null;
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  brand_band: "Hizmet Bandı",
  branches: "Branşlar",
  about: "Hakkımızda",
  why_so3: "Neden SO3",
  process: "Süreç",
  trainers: "Eğitmenler",
  performance: "Performans",
  community: "Topluluk / Etkinlikler",
  instagram: "Instagram",
  tour: "360° Tur",
  contact: "İletişim",
};

export function Homepage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [editingSection, setEditingSection] = useState<string | null>(null);


  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/homepage/sections');
      if (Array.isArray(res)) {
        setSections(res as HomepageSection[]);
      } else {
        throw new Error('Geçersiz API yanıtı.');
      }
    } catch (err: any) {
      setError(err.message || 'Bölümler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const refreshSectionsMetadata = async () => {
    try {
      const res = await apiClient.get('/api/admin/homepage/sections');
      if (Array.isArray(res)) {
        setSections(res as HomepageSection[]);
      }
    } catch (err) {
      // Failed to refresh metadata silently
    }
  };

  const handleToggleActive = async (sectionId: string, currentActive: number) => {
    // Optimistic update
    const newActive = currentActive ? 0 : 1;
    setSections(prev => 
      prev.map(s => s.section_id === sectionId ? { ...s, is_active: newActive } : s)
    );

    try {
      await apiClient.patch(`/api/admin/homepage/sections/${sectionId}`, {
        is_active: !!newActive
      });
    } catch (err: any) {
      // Revert on error
      setSections(prev => 
        prev.map(s => s.section_id === sectionId ? { ...s, is_active: currentActive } : s)
      );
      setError(err.message || 'Görünürlük güncellenemedi.');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...sections];
    const temp = newSections[index - 1];
    newSections[index - 1] = newSections[index];
    newSections[index] = temp;
    setSections(newSections);
    setIsDirty(true);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    const temp = newSections[index + 1];
    newSections[index + 1] = newSections[index];
    newSections[index] = temp;
    setSections(newSections);
    setIsDirty(true);
  };

  const saveOrder = async () => {
    try {
      setIsSavingOrder(true);
      setError(null);
      await apiClient.patch('/api/admin/homepage/sections/order', {
        sections: sections.map(s => s.section_id)
      });
      setIsDirty(false);
    } catch (err: any) {
      setError(err.message || 'Sıralama güncellenirken bir hata oluştu.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-white/50 animate-pulse">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Ana Sayfa Yönetimi</h1>
        <p className="text-white/60">
          Ana sayfadaki bölümlerin görünürlüğünü ve sırasını yönetin.
        </p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-lg p-4 md:p-6 mb-8">
        <p className="text-sm text-amber-500/90 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          Sayfa yapısı SO3 marka düzenini korumak için kontrollüdür. Bölümleri açıp kapatabilir ve sıralayabilirsiniz.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={saveOrder}
          disabled={!isDirty || isSavingOrder}
          className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition ${
            isDirty 
              ? 'bg-[#851C35] text-white hover:bg-[#9A203E]' 
              : 'bg-white/5 text-white/40 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {isSavingOrder ? 'Kaydediliyor...' : 'Sıralamayı Kaydet'}
        </button>
      </div>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div 
            key={section.section_id}
            className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/10 rounded-lg group"
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-white/30 hover:text-white disabled:opacity-30 disabled:hover:text-white/30 transition"
                  title="Yukarı Taşı"
                >
                  <MoveUp className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => moveDown(index)}
                  disabled={index === sections.length - 1}
                  className="p-1 text-white/30 hover:text-white disabled:opacity-30 disabled:hover:text-white/30 transition"
                  title="Aşağı Taşı"
                >
                  <MoveDown className="w-4 h-4" />
                </button>
              </div>
              
              <div>
                <h3 className="text-white font-medium">
                  {SECTION_LABELS[section.section_id] || section.section_id}
                </h3>
                <div className="text-xs text-white/40 font-mono mt-1">
                  ID: {section.section_id}
                </div>
                {section.updated_at && (
                  <div className="text-xs text-white/30 mt-1">
                    Son güncelleme: {new Date(section.updated_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                )}
              </div>
            </div>


            <div className="flex items-center gap-6">
              {['hero', 'brand_band', 'about', 'why_so3', 'process'].includes(section.section_id) && (
                <button
                  onClick={() => setEditingSection(section.section_id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Düzenle
                </button>
              )}
              <button

                onClick={() => handleToggleActive(section.section_id, section.is_active)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  section.is_active 
                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {section.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {section.is_active ? 'Aktif' : 'Pasif'}
              </button>
            </div>
          </div>
        ))}
      </div>


      {editingSection === 'hero' && <HeroEditor onClose={() => setEditingSection(null)} onSaved={refreshSectionsMetadata} />}
      {editingSection === 'brand_band' && <BrandBandEditor onClose={() => setEditingSection(null)} onSaved={refreshSectionsMetadata} />}
      {editingSection === 'about' && <AboutEditor onClose={() => setEditingSection(null)} onSaved={refreshSectionsMetadata} />}
      {editingSection === 'why_so3' && <WhySo3Editor onClose={() => setEditingSection(null)} onSaved={refreshSectionsMetadata} />}
      {editingSection === 'process' && <ProcessEditor onClose={() => setEditingSection(null)} onSaved={refreshSectionsMetadata} />}
    </div>
  );
}
