import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pen, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { apiClient, ApiError } from "../../api/client";
import { AdminTrainerListItem } from "./types";

export function AdminTrainersList() {
  const [trainers, setTrainers] = useState<AdminTrainerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/admin/trainers') as AdminTrainerListItem[];
      setTrainers(data);
      setError(null);
      setOrderDirty(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Eğitmenler yüklenirken bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (trainer: AdminTrainerListItem) => {
    const originalState = [...trainers];
    const updated = trainers.map(t => 
      t.id === trainer.id ? { ...t, is_active: !t.is_active } : t
    );
    setTrainers(updated);

    try {
      await apiClient.patch(`/api/admin/trainers/${trainer.id}`, {
        is_active: !trainer.is_active
      });
    } catch (err: unknown) {
      setTrainers(originalState);
      if (err instanceof ApiError) {
        alert("Durum güncellenemedi: " + err.message);
      } else {
        alert("Durum güncellenemedi.");
      }
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === trainers.length - 1) return;

    const newTrainers = [...trainers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newTrainers[index];
    newTrainers[index] = newTrainers[targetIndex];
    newTrainers[targetIndex] = temp;
    
    setTrainers(newTrainers);
    setOrderDirty(true);
  };

  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const trainerIds = trainers.map(t => t.id);
      await apiClient.patch('/api/admin/trainers/order', { trainer_ids: trainerIds });
      setOrderDirty(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        alert("Sıralama kaydedilemedi: " + err.message);
      } else {
        alert("Sıralama kaydedilemedi.");
      }
    } finally {
      setSavingOrder(false);
    }
  };

  if (loading) {
    return <div className="text-white/50">Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Eğitmenler</h2>
          <p className="text-sm text-white/50">Eğitmen kadrosunu, branşlarını ve profil bilgilerini yönetin.</p>
        </div>
        <div className="flex gap-3">
          {orderDirty && (
            <button
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded transition disabled:opacity-50"
            >
              {savingOrder ? 'Kaydediliyor...' : 'Sıralamayı Kaydet'}
            </button>
          )}
          <Link
            to="/admin/trainers/new"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-white/90 transition"
          >
            <Plus className="w-4 h-4" />
            Yeni Eğitmen
          </Link>
        </div>
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-white/5 text-white/40">
              <tr>
                <th className="px-6 py-4 font-medium">Profil</th>
                <th className="px-6 py-4 font-medium">Ad Soyad</th>
                <th className="px-6 py-4 font-medium">Görev / Ünvan</th>
                <th className="px-6 py-4 font-medium">Branş</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trainers.map((trainer, index) => (
                <tr key={trainer.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    {trainer.profile ? (
                      <img 
                        src={trainer.profile.thumbnail_url || trainer.profile.url} 
                        alt={trainer.profile.alt_text || trainer.name}
                        className="w-12 h-12 object-cover rounded bg-white/5"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center text-white/20 text-[10px] leading-tight text-center p-1">
                        Fotoğraf<br/>yok
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{trainer.name}</td>
                  <td className="px-6 py-4 text-white/70">{trainer.role_title}</td>
                  <td className="px-6 py-4 text-white/70">{trainer.branch.name}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(trainer)}
                      className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded ${
                        trainer.is_active 
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                          : 'bg-white/10 text-white/50 hover:bg-white/20'
                      }`}
                    >
                      {trainer.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-2 text-white/40 hover:text-white disabled:opacity-30 transition"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === trainers.length - 1}
                        className="p-2 text-white/40 hover:text-white disabled:opacity-30 transition"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/admin/trainers/${trainer.id}`}
                        className="p-2 text-white/40 hover:text-white transition"
                        title="Düzenle"
                      >
                        <Pen className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {trainers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                    Henüz eğitmen eklenmemiş.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
