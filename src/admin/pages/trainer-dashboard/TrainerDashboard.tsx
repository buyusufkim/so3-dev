import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import { TrainerDashboardData, isTrainerDashboardData } from "./types";
import { Users, Dumbbell, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

function formatSafeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export function TrainerDashboard() {
  const [data, setData] = useState<TrainerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get('/api/trainer/dashboard');
        if (!isSubscribed) return;

        if (isTrainerDashboardData(response)) {
          setData(response);
        } else {
          setError('Dashboard verileri doğrulanamadı.');
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;

        if (err instanceof ApiError) {
          if (err.code === 'TRAINER_PROFILE_NOT_LINKED') {
            setError('Aktif eğitmen profiliniz hesabınıza bağlanmamış.');
          } else if (err.status === 403 || err.code === 'FORBIDDEN') {
            setError('Bu alana erişim yetkiniz yok.');
          } else if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
            setError('Dashboard isteği doğrulanamadı.');
          } else if (err.status === 404 || err.code === 'NOT_FOUND') {
            setError('Dashboard verileri bulunamadı.');
          } else {
            setError('Dashboard verileri yüklenirken bir hata oluştu.');
          }
        } else if (err instanceof Error) {
          setError('Dashboard verileri yüklenirken bir hata oluştu.');
        } else {
          setError('Dashboard verileri yüklenirken bir hata oluştu.');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      isSubscribed = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-white/10 rounded"></div>
            <div className="h-4 w-64 bg-white/5 rounded"></div>
          </div>
          <div className="h-10 w-36 bg-white/10 rounded"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#121212] border border-white/10 rounded-lg p-5 space-y-3">
              <div className="h-4 w-24 bg-white/10 rounded"></div>
              <div className="h-8 w-16 bg-white/20 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#121212] border border-white/10 rounded-lg p-4 space-y-2">
              <div className="h-3 w-20 bg-white/10 rounded"></div>
              <div className="h-6 w-12 bg-white/20 rounded"></div>
            </div>
          ))}
        </div>

        <div className="h-64 bg-[#121212] border border-white/10 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121212] border border-white/10 rounded-lg p-8 text-center max-w-lg mx-auto space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">Yükleme Başarısız</h3>
        <p className="text-sm text-white/60">{error}</p>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#851C35] hover:bg-[#a02240] text-white text-sm font-medium rounded transition"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Eğitmen Paneli</h2>
          <p className="text-white/50 text-sm mt-1">
            Hoş geldin, {data.trainer.display_name}.
          </p>
        </div>
        <Link
          to="/admin/my-members"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded transition"
        >
          <Users className="w-4 h-4 text-white/70" />
          Tüm Üyeler
          <ArrowRight className="w-4 h-4 text-white/40" />
        </Link>
      </div>

      {/* Member Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[#851C35]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">Üye Durumu</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#121212] border border-white/10 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-white/50 font-medium">Toplam Üye</div>
            <div className="text-3xl font-bold text-white mt-2">{data.members.total}</div>
          </div>
          <div className="bg-[#121212] border border-white/10 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-green-400/80 font-medium">Aktif Üye</div>
            <div className="text-3xl font-bold text-green-400 mt-2">{data.members.active}</div>
          </div>
          <div className="bg-[#121212] border border-white/10 rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-red-400/80 font-medium">Pasif Üye</div>
            <div className="text-3xl font-bold text-red-400 mt-2">{data.members.inactive}</div>
          </div>
        </div>
      </div>

      {/* Training Program Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-[#851C35]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">Antrenman Programları</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-white/50 font-medium">Toplam Program</div>
            <div className="text-2xl font-bold text-white mt-1">{data.training_programs.total}</div>
          </div>
          <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-green-400/80 font-medium">Aktif</div>
            <div className="text-2xl font-bold text-green-400 mt-1">{data.training_programs.active}</div>
          </div>
          <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-amber-400/80 font-medium">Taslak</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{data.training_programs.draft}</div>
          </div>
          <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-white/40 font-medium">Arşiv</div>
            <div className="text-2xl font-bold text-white/60 mt-1">{data.training_programs.archived}</div>
          </div>
        </div>
      </div>

      {/* Recent Members */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-white">Son Güncellenen Üyeler</h3>
          <Link
            to="/admin/my-members"
            className="text-xs text-[#851C35] hover:text-[#a02240] font-medium transition"
          >
            Tümünü Gör
          </Link>
        </div>

        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          {data.recent_members.length === 0 ? (
            <div className="p-8 text-center text-white/50 text-sm">
              Henüz atanmış veya güncellenen üye bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-medium text-white/70">Üye</th>
                    <th className="px-4 py-3 font-medium text-white/70">Durum</th>
                    <th className="px-4 py-3 font-medium text-white/70">Son Güncelleme</th>
                    <th className="px-4 py-3 font-medium text-white/70 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.recent_members.map((member) => (
                    <tr key={member.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-xs text-white/40 font-mono mt-0.5">{member.uuid}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            member.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {member.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {formatSafeDate(member.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/my-members/${member.id}`}
                          className="text-xs font-medium text-[#851C35] hover:text-[#a02240] transition"
                        >
                          İncele
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
