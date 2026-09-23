import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { OperationsAnalyticsPanel } from "../components/OperationsAnalyticsPanel";

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


import { AdminUser, isAdminUser } from "../auth/roles";

interface OperationalMetrics {
  active_members: number;
  current_occupancy: number;
  visits_today: number;
  renewals_today: number;
  appointments_today: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
}

export function Dashboard() {
  const [opData, setOpData] = useState<OperationalMetrics | null>(null);
  const [opLoading, setOpLoading] = useState(false);
  const [opError, setOpError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  
  useEffect(() => {
    const fetchRoleAndOps = async () => {
      try {
        const meResponse = await apiClient.get('/api/auth/me');
        if (isAdminUser(meResponse)) {
          if (meResponse.role === 'admin' || meResponse.role === 'super_admin') {
            setIsAdmin(true);
            setOpLoading(true);
            try {
              const opResponse = await apiClient.get('/api/admin/dashboard/operations');
              if (opResponse && typeof opResponse === 'object' && 'metrics' in opResponse) {
                setOpData((opResponse as any).metrics as OperationalMetrics);
              }
            } catch (err: unknown) {
              setOpError("Operasyonel veriler alınamadı.");
            } finally {
              setOpLoading(false);
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    };
    fetchRoleAndOps();
  }, []);

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

      {isAdmin && (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-white">Operasyon Özeti</h3>
            {opLoading ? (
               <div className="text-white/50 text-sm">Operasyonel veriler yükleniyor...</div>
            ) : opError ? (
               <div className="text-red-400 text-sm">{opError}</div>
            ) : opData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Aktif Üyeler</div>
                  <div className="text-2xl font-bold text-white">{opData.active_members}</div>
                </div>
                <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">İçerideki Üye</div>
                  <div className="text-2xl font-bold text-white">{opData.current_occupancy}</div>
                </div>
                <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bugünkü Ziyaret</div>
                  <div className="text-2xl font-bold text-white">{opData.visits_today}</div>
                </div>
                <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bugünkü Yenilemeler</div>
                  <div className="text-2xl font-bold text-white">{opData.renewals_today}</div>
                </div>
                <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-lg flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bugünkü Randevular</div>
                  <div className="text-2xl font-bold text-white mb-2">{opData.appointments_today.total}</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/50">
                    <div>Bkl: <span className="text-white/80">{opData.appointments_today.scheduled}</span></div>
                    <div>Tml: <span className="text-white/80">{opData.appointments_today.completed}</span></div>
                    <div>İpt: <span className="text-white/80">{opData.appointments_today.cancelled}</span></div>
                    <div>GelM: <span className="text-white/80">{opData.appointments_today.no_show}</span></div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mb-8">
            <OperationsAnalyticsPanel />
          </div>
        </>
      )}

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
