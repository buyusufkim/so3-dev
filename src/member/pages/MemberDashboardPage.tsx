import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';
import { 
  MemberOverview, 
  MemberSessionPackage, 
  MemberAppointmentsData, 
  MemberTrainingProgram 
} from '../api/validators';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split(' ')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const months = [
    '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  return `${day} ${months[month]} ${year}`;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const time = dateStr.split(' ')[1];
  if (!time) return '';
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

export function MemberDashboardPage() {
  const { identity, isLoading, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<MemberOverview | null>(null);
  const [packages, setPackages] = useState<MemberSessionPackage[] | null>(null);
  const [appointments, setAppointments] = useState<MemberAppointmentsData | null>(null);
  const [programs, setPrograms] = useState<MemberTrainingProgram[] | null>(null);
  
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const fetchData = async (abortController?: AbortController) => {
    try {
      setIsDataLoading(true);
      setDataError(null);

      const signal = abortController?.signal;

      const [o, p, a, t] = await Promise.all([
        memberApiClient.getOverview(signal),
        memberApiClient.getSessionPackages(signal),
        memberApiClient.getAppointments(signal),
        memberApiClient.getTrainingPrograms(signal)
      ]);

      if (signal?.aborted) return;

      setOverview(o);
      setPackages(p);
      setAppointments(a);
      setPrograms(t);
    } catch (err) {
      if (abortController?.signal.aborted) return;

      if (err instanceof MemberApiError && err.code === 'PASSWORD_CHANGE_REQUIRED') {
        await refreshIdentity();
        navigate('/uye/sifre-degistir', { replace: true });
        return;
      }
      
      setDataError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      if (!abortController?.signal.aborted) {
        setIsDataLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isLoading && identity && !identity.account.must_change_password) {
      const abortController = new AbortController();
      fetchData(abortController);
      return () => {
        abortController.abort();
      };
    }
  }, [isLoading, identity]);

  if (!isLoading && !identity) {
    return <Navigate to="/uye/giris" replace />;
  }

  if (!isLoading && identity?.account.must_change_password) {
    return <Navigate to="/uye/sifre-degistir" replace />;
  }

  if (isDataLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-24 bg-[#121212] border border-white/5 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-[#121212] border border-white/5 rounded-2xl"></div>
          <div className="h-64 bg-[#121212] border border-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-red-400 mb-4">{dataError}</p>
        <button 
          onClick={() => fetchData(new AbortController())}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors text-sm font-medium"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 text-center text-white/50">
        Geçersiz sunucu yanıtı.
      </div>
    );
  }

  const membershipStatusMap: Record<string, string> = {
    active: 'Üyeliğin Aktif',
    upcoming: 'Yakında Başlıyor',
    expired: 'Üyelik Süresi Doldu',
    not_set: 'Üyelik Tarihi Tanımlanmamış'
  };

  const packageStatusMap: Record<string, string> = {
    active: 'Aktif',
    expired: 'Süresi Doldu',
    exhausted: 'Tükendi',
    cancelled: 'İptal'
  };

  const appointmentStatusMap: Record<string, string> = {
    scheduled: 'Planlandı',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    no_show: 'Katılım Olmadı'
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
          Merhaba, {overview.member.first_name}
        </h1>
        <p className="text-white/50 text-sm">
          Durum özeti ve antrenman bilgilerin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Membership */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-wider">Üyelik Durumu</h2>
          <div className="flex items-start justify-between mb-6">
            <div className="text-xl font-medium text-white">
              {membershipStatusMap[overview.membership.status] || 'Bilinmiyor'}
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
              overview.membership.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
              overview.membership.status === 'upcoming' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              'bg-white/5 text-white/40 border-white/10'
            }`}>
              {overview.membership.status === 'active' ? 'Aktif' : overview.membership.status === 'upcoming' ? 'Yakında' : 'Pasif'}
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-white/40 mb-1 text-xs">Başlangıç</div>
              <div className="text-white/90">{formatDate(overview.membership.start_date)}</div>
            </div>
            <div>
              <div className="text-white/40 mb-1 text-xs">Bitiş</div>
              <div className="text-white/90">{formatDate(overview.membership.end_date)}</div>
            </div>
          </div>
        </div>

        {/* Trainer */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h2 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-wider">Antrenörün</h2>
          {overview.trainer ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <span className="text-white/50 text-lg font-medium">{overview.trainer.name.charAt(0)}</span>
              </div>
              <div>
                <div className="text-lg font-medium text-white">{overview.trainer.name}</div>
                <div className="text-sm text-[#851C35]">{overview.trainer.role_title}</div>
              </div>
            </div>
          ) : (
            <div className="text-white/60 h-12 flex items-center">
              Henüz bir antrenör atanmamış.
            </div>
          )}
        </div>
      </div>

      {/* Packages */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4">Seans Paketleri</h2>
        {!packages || packages.length === 0 ? (
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
            Henüz tanımlı bir seans paketin bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-[#121212] border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-medium text-white line-clamp-1">{pkg.package_name}</div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${
                    pkg.effective_status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    'bg-white/5 text-white/40 border-white/10'
                  }`}>
                    {packageStatusMap[pkg.effective_status] || pkg.effective_status}
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Kalan</span>
                    <span className="text-white font-medium">{pkg.remaining_sessions} seans</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Planlanan</span>
                    <span className="text-white">{pkg.reserved_sessions} seans</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Son Geçerlilik</span>
                    <span className="text-white/80">{formatDate(pkg.valid_until)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium text-white mb-4">Yaklaşan Randevular</h2>
          {!appointments?.upcoming || appointments.upcoming.length === 0 ? (
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
              Planlanmış bir randevun bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.upcoming.slice(0, 5).map(app => (
                <div key={app.id} className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center min-w-20">
                    <div className="text-xs text-white/50 uppercase mb-0.5">{formatDate(app.starts_at).split(' ')[1]}</div>
                    <div className="text-lg font-medium text-white">{formatDate(app.starts_at).split(' ')[0]}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm sm:text-base truncate">
                      {formatTime(app.starts_at)} - {formatTime(app.ends_at)}
                    </div>
                    {app.trainer && (
                      <div className="text-white/50 text-xs sm:text-sm truncate mt-0.5">
                        {app.trainer.name}
                      </div>
                    )}
                    {app.session_package && (
                      <div className="text-[#851C35] text-xs truncate mt-1">
                        {app.session_package.package_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium text-white mb-4">Geçmiş Randevular</h2>
          {!appointments?.recent || appointments.recent.length === 0 ? (
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
              Geçmiş randevun bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.recent.slice(0, 5).map(app => (
                <div key={app.id} className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center min-w-16 opacity-70">
                    <div className="text-xs text-white/50 uppercase mb-0.5">{formatDate(app.starts_at).split(' ')[1]}</div>
                    <div className="text-base font-medium text-white">{formatDate(app.starts_at).split(' ')[0]}</div>
                  </div>
                  <div className="flex-1 min-w-0 opacity-80">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="text-white font-medium text-sm truncate">
                        {formatTime(app.starts_at)} - {formatTime(app.ends_at)}
                      </div>
                      <div className="text-[10px] text-white/40 border border-white/10 px-1.5 py-0.5 rounded shrink-0">
                        {appointmentStatusMap[app.status] || app.status}
                      </div>
                    </div>
                    {app.trainer && (
                      <div className="text-white/50 text-xs truncate">
                        {app.trainer.name}
                      </div>
                    )}
                    {app.status === 'cancelled' && app.cancellation_reason && (
                      <div className="text-red-400/80 text-xs truncate mt-1">
                        İptal: {app.cancellation_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Training Programs */}
      <div>
        <h2 className="text-lg font-medium text-white mb-4">Antrenman Programları</h2>
        {!programs || programs.length === 0 ? (
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
            Aktif antrenman programın bulunmuyor.
          </div>
        ) : (
          <div className="space-y-6">
            {programs.map(prog => (
              <div key={prog.id} className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-white font-medium text-lg mb-1">{prog.title}</h3>
                    <div className="text-white/50 text-sm">
                      {prog.trainer ? prog.trainer.name : 'Antrenörsüz'} • {formatDate(prog.start_date)} - {formatDate(prog.end_date)}
                    </div>
                  </div>
                </div>
                
                {prog.exercises.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {prog.exercises.map(ex => (
                      <div key={ex.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                        <div className="flex-1">
                          <div className="text-white font-medium mb-1">{ex.exercise_name}</div>
                          {ex.instructions && (
                            <div className="text-white/50 text-sm">{ex.instructions}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 sm:justify-end shrink-0">
                          {ex.sets !== null && (
                            <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
                              <div className="text-[10px] text-white/40 uppercase mb-0.5">Set</div>
                              <div className="text-white font-medium text-sm">{ex.sets}</div>
                            </div>
                          )}
                          {ex.repetitions && (
                            <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
                              <div className="text-[10px] text-white/40 uppercase mb-0.5">Tekrar</div>
                              <div className="text-white font-medium text-sm">{ex.repetitions}</div>
                            </div>
                          )}
                          {ex.duration_seconds !== null && (
                            <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
                              <div className="text-[10px] text-white/40 uppercase mb-0.5">Süre</div>
                              <div className="text-white font-medium text-sm">{ex.duration_seconds}s</div>
                            </div>
                          )}
                          {ex.rest_seconds !== null && (
                            <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
                              <div className="text-[10px] text-white/40 uppercase mb-0.5">Dinlenme</div>
                              <div className="text-white font-medium text-sm">{ex.rest_seconds}s</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-white/40 text-sm">
                    Bu programa henüz egzersiz eklenmemiş.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
