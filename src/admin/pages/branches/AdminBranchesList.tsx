import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Image as ImageIcon, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { apiClient, ApiError } from '../../api/client';
import { AdminBranchListItem } from './types';

export function AdminBranchesList() {
  const [branches, setBranches] = useState<AdminBranchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/api/admin/branches');
      if (Array.isArray(res)) {
        setBranches(res as AdminBranchListItem[]);
      } else if (res && Array.isArray(res.data)) {
        setBranches(res.data as AdminBranchListItem[]);
      } else {
         setBranches(res as any);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Branşlar yüklenirken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    // Optimistic update
    setBranches(prev => 
      prev.map(b => b.id === id ? { ...b, is_active: !currentActive } : b)
    );
    try {
      await apiClient.patch(`/api/admin/branches/${id}`, { is_active: !currentActive });
    } catch (err: any) {
      // Revert on error
      setBranches(prev => 
        prev.map(b => b.id === id ? { ...b, is_active: currentActive } : b)
      );
      setError(err instanceof ApiError ? err.message : 'Durum güncellenemedi.');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newBranches = [...branches];
    const temp = newBranches[index];
    newBranches[index] = newBranches[index - 1];
    newBranches[index - 1] = temp;
    setBranches(newBranches);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const moveDown = (index: number) => {
    if (index === branches.length - 1) return;
    const newBranches = [...branches];
    const temp = newBranches[index];
    newBranches[index] = newBranches[index + 1];
    newBranches[index + 1] = temp;
    setBranches(newBranches);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSaveOrder = async () => {
    try {
      setIsSavingOrder(true);
      setError('');
      setSaveSuccess(false);
      const branch_ids = branches.map(b => b.id);
      await apiClient.patch('/api/admin/branches/order', { branch_ids });
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Sıralama kaydedilemedi.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white/50 text-sm">Yükleniyor...</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-white mb-1">Branşlar</h1>
          <p className="text-sm text-white/50">Branşları, kapak görsellerini ve galeri sıralamasını yönetin.</p>
        </div>
        <Link 
          to="/admin/branches/new"
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded text-sm font-medium hover:bg-white/90 transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Branş
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {isDirty && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded flex items-center justify-between">
          <div className="text-sm text-blue-400">Sıralama değiştirildi. Kaydetmeyi unutmayın.</div>
          <button 
            onClick={handleSaveOrder}
            disabled={isSavingOrder}
            className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50"
          >
            {isSavingOrder ? 'Kaydediliyor...' : 'Sıralamayı Kaydet'}
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
          Sıralama başarıyla kaydedildi.
        </div>
      )}

      <div className="space-y-3">
        {branches.length === 0 ? (
          <div className="text-sm text-white/40 italic p-4 border border-white/5 rounded">Henüz branş eklenmemiş.</div>
        ) : (
          branches.map((branch, index) => (
            <div 
              key={branch.id}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded group hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-white/30 hover:text-white disabled:opacity-30 disabled:hover:text-white/30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveDown(index)}
                    disabled={index === branches.length - 1}
                    className="p-1 text-white/30 hover:text-white disabled:opacity-30 disabled:hover:text-white/30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="w-16 h-16 rounded overflow-hidden bg-black/50 flex items-center justify-center flex-shrink-0 border border-white/10">
                  {branch.cover ? (
                    <img 
                      src={branch.cover.thumbnail_url || branch.cover.url} 
                      alt={branch.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-white/20" />
                  )}
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-white mb-1">{branch.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded">/{branch.slug}</span>
                    <span>•</span>
                    <span>{branch.gallery_count} galeri görseli</span>
                    {branch.updated_at && (
                      <>
                        <span>•</span>
                        <span>Son güncelleme: {new Date(branch.updated_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleActive(branch.id, branch.is_active)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition ${
                    branch.is_active 
                      ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {branch.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {branch.is_active ? 'Aktif' : 'Pasif'}
                </button>

                <Link
                  to={`/admin/branches/${branch.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Düzenle
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
