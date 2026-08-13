import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get('/api/admin/dashboard');
        setData(response);
      } catch (err: any) {
        setError(err.message || "Veriler alınamadı.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-white/50">Yükleniyor...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Sistem Özeti</h2>
        <p className="text-white/50 text-sm">SO3 PT Control paneline hoş geldiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121212] border border-white/10 p-6 rounded-lg">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Sistem Durumu</div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${data.system_status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium text-lg uppercase">{data.system_status}</span>
          </div>
        </div>

        <div className="bg-[#121212] border border-white/10 p-6 rounded-lg">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Veritabanı</div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${data.database_status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium text-lg capitalize">{data.database_status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-lg opacity-50">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Etkinlikler</div>
          <div className="text-3xl font-bold">{data.metrics?.events ?? <span className="text-sm font-normal text-white/50">Henüz aktif değil</span>}</div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Medya Assets</div>
          <div className="text-3xl font-bold text-white">{data.metrics?.media ?? <span className="text-sm font-normal text-white/50">Henüz aktif değil</span>}</div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-lg opacity-50">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Ziyaretçiler</div>
          <div className="text-3xl font-bold">{data.metrics?.visitors ?? <span className="text-sm font-normal text-white/50">Henüz aktif değil</span>}</div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-lg opacity-50">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Eğitmenler</div>
          <div className="text-3xl font-bold">{data.metrics?.trainers ?? <span className="text-sm font-normal text-white/50">Henüz aktif değil</span>}</div>
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t border-white/10">
        <p className="text-xs text-white/30">CMS modülleri ve denetim kayıtları sonraki fazda aktif edilecektir.</p>
      </div>
    </div>
  );
}
