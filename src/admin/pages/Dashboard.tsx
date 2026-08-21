import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface DashboardMetrics {
  events: {
    published: number;
    draft: number;
    total: number;
  };
  media_active: number;
  trainers_active: number;
  branches_active: number;
  homepage_sections_active: number;
}

interface DashboardData {
  system_status: string;
  database_status: string;
  metrics: DashboardMetrics;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get('/api/admin/dashboard');
        setData(response as DashboardData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Veriler alınamadı.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div className="text-white/50">Yükleniyor...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data) return <div className="text-red-400">Veri bulunamadı.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Sistem Özeti</h2>
        <p className="text-white/50 text-sm">SO3 PT Control paneline hoş geldiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg flex flex-col justify-between">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Etkinlikler</div>
          <div>
            <div className="text-3xl font-bold mb-2">{data.metrics.events.total}</div>
            <div className="flex gap-4 text-sm text-white/50">
              <span>{data.metrics.events.published} Yayında</span>
              <span>{data.metrics.events.draft} Taslak</span>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg flex flex-col justify-between">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Eğitmenler</div>
          <div className="text-3xl font-bold text-white">{data.metrics.trainers_active}</div>
          <div className="text-sm text-white/50 mt-2">Aktif Eğitmen</div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg flex flex-col justify-between">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Branşlar</div>
          <div className="text-3xl font-bold text-white">{data.metrics.branches_active}</div>
          <div className="text-sm text-white/50 mt-2">Aktif Branş</div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg flex flex-col justify-between">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Ana Sayfa Bölümleri</div>
          <div className="text-3xl font-bold text-white">{data.metrics.homepage_sections_active}</div>
          <div className="text-sm text-white/50 mt-2">Aktif Bölüm</div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-lg flex flex-col justify-between">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Medya Assets</div>
          <div className="text-3xl font-bold text-white">{data.metrics.media_active}</div>
          <div className="text-sm text-white/50 mt-2">Aktif Medya</div>
        </div>
      </div>
    </div>
  );
}
