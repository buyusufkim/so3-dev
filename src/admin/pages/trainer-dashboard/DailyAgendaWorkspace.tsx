import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { apiClient, ApiError } from "../../api/client";
import {
  TrainerDailyAgenda,
  validateTrainerDailyAgenda
} from "./types";
import {
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CalendarDays
} from "lucide-react";

function formatWallTime(dateStr: string): string {
  if (typeof dateStr === 'string' && dateStr.length >= 16) {
    return dateStr.substring(11, 16);
  }
  return dateStr;
}

function formatSafeBusinessDate(dateStr: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

const APPT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
  cancelled: 'İptal'
};

const APPT_TEMPORAL_LABELS: Record<string, string> = {
  upcoming: 'Yaklaşan',
  in_progress: 'Şu an',
  past_due: 'Aksiyon bekliyor'
};

export function DailyAgendaWorkspace() {
  const [agenda, setAgenda] = useState<TrainerDailyAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const mountedRef = useRef<boolean>(true);
  const abortRef = useRef<AbortController | null>(null);
  const requestGenRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const generation = ++requestGenRef.current;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    const fetchDailyAgenda = async () => {
      try {
        const response = await apiClient.get('/api/trainer/daily-agenda', { signal: controller.signal });
        if (!mountedRef.current || controller.signal.aborted || generation !== requestGenRef.current) {
          return;
        }

        const validatedAgenda = validateTrainerDailyAgenda(response);
        if (mountedRef.current && generation === requestGenRef.current) {
          setAgenda(validatedAgenda);
        }
      } catch (err: unknown) {
        if (!mountedRef.current || controller.signal.aborted || generation !== requestGenRef.current) {
          return;
        }

        if (err instanceof ApiError) {
          if (err.code === 'TRAINER_PROFILE_NOT_LINKED') {
            setError('Aktif eğitmen profiliniz hesabınıza bağlanmamış.');
          } else if (err.status === 403 || err.code === 'FORBIDDEN') {
            setError('Bu alana erişim yetkiniz yok.');
          } else if (err.status === 422 || err.code === 'VALIDATION_ERROR') {
            setError('Ajanda isteği doğrulanamadı.');
          } else if (err.code === 'TRAINER_DAILY_AGENDA_INCONSISTENT') {
            setError('Günlük randevu verileri doğrulanamadı. Randevular ekranını kontrol edin veya yöneticiyle iletişime geçin.');
          } else {
            setError('Bugünün programı yüklenirken bir hata oluştu.');
          }
        } else if (err instanceof Error) {
          if (err.name === 'AbortError') return;
          setError('Bugünün programı yüklenirken bir hata oluştu.');
        } else {
          setError('Bugünün programı yüklenirken bir hata oluştu.');
        }
      } finally {
        if (mountedRef.current && generation === requestGenRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDailyAgenda();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      {/* Workspace Header / Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#851C35]" />
            Bugünün Programı
          </h2>
          {agenda && (
            <p className="text-xs text-white/50 mt-0.5">
              {formatSafeBusinessDate(agenda.business_date)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium rounded transition disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && !agenda && (
        <div className="bg-[#121212] border border-white/10 rounded-lg p-5 space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg p-3 space-y-2">
                <div className="h-3 w-16 bg-white/10 rounded" />
                <div className="h-6 w-10 bg-white/20 rounded" />
              </div>
            ))}
          </div>
          <div className="h-24 bg-white/5 rounded-lg" />
        </div>
      )}

      {/* Error Panel */}
      {!loading && error && !agenda && (
        <div className="bg-[#121212] border border-red-500/20 rounded-lg p-5 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Bugünün programı yüklenemedi.</h4>
            <p className="text-xs text-white/60 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#851C35] hover:bg-[#a02240] text-white text-xs font-medium rounded transition min-h-[44px] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Agenda Main Content */}
      {agenda && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4">
            <div className="bg-[#121212] border border-white/10 rounded-lg p-3 lg:p-4">
              <div className="text-[10px] lg:text-xs uppercase tracking-wider text-white/50 font-medium">Toplam</div>
              <div className="text-xl lg:text-2xl font-bold text-white mt-1">{agenda.summary.total}</div>
            </div>
            <div className="bg-[#121212] border border-white/10 rounded-lg p-3 lg:p-4">
              <div className="text-[10px] lg:text-xs uppercase tracking-wider text-blue-400/80 font-medium">Kalan</div>
              <div className="text-xl lg:text-2xl font-bold text-blue-400 mt-1">{agenda.summary.remaining_scheduled}</div>
            </div>
            <div className="bg-[#121212] border border-white/10 rounded-lg p-3 lg:p-4">
              <div className="text-[10px] lg:text-xs uppercase tracking-wider text-green-400/80 font-medium">Tamamlandı</div>
              <div className="text-xl lg:text-2xl font-bold text-green-400 mt-1">{agenda.summary.completed}</div>
            </div>
            <div className="bg-[#121212] border border-white/10 rounded-lg p-3 lg:p-4">
              <div className="text-[10px] lg:text-xs uppercase tracking-wider text-amber-400/80 font-medium">Aksiyon Bekleyen</div>
              <div className="text-xl lg:text-2xl font-bold text-amber-400 mt-1">{agenda.summary.past_due_scheduled}</div>
            </div>
          </div>

          {/* Current & Next Focus Cards */}
          {(agenda.focus.current || agenda.focus.next) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agenda.focus.current && (
                <div className="bg-[#121212] border-2 border-[#851C35]/60 bg-[#851C35]/5 rounded-lg p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#851C35] text-white">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Şu An
                      </span>
                      <span className="text-xs text-white/60 font-mono">
                        {formatWallTime(agenda.focus.current.starts_at)} – {formatWallTime(agenda.focus.current.ends_at)}
                      </span>
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        {agenda.focus.current.member.first_name} {agenda.focus.current.member.last_name}
                      </div>
                      {agenda.focus.current.session_package && (
                        <div className="text-xs text-white/50 mt-0.5">
                          {agenda.focus.current.session_package.package_name}
                        </div>
                      )}
                      <div className="text-xs text-[#851C35] font-medium mt-1">
                        Şu an devam ediyor
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/admin/my-appointments"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#851C35] hover:bg-[#a02240] text-white text-xs font-medium rounded transition min-h-[44px]"
                  >
                    Randevuyu Aç
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {agenda.focus.next && (
                <div className="bg-[#121212] border border-white/10 rounded-lg p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80">
                        Sıradaki
                      </span>
                      <span className="text-xs text-white/60 font-mono">
                        {formatWallTime(agenda.focus.next.starts_at)} – {formatWallTime(agenda.focus.next.ends_at)}
                      </span>
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        {agenda.focus.next.member.first_name} {agenda.focus.next.member.last_name}
                      </div>
                      {agenda.focus.next.session_package && (
                        <div className="text-xs text-white/50 mt-0.5">
                          {agenda.focus.next.session_package.package_name}
                        </div>
                      )}
                      <div className="text-xs text-white/40 mt-1">
                        Planlanan sonraki seans
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/admin/my-appointments"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium rounded transition min-h-[44px]"
                  >
                    Randevulara Git
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Needs Terminalization Warning Banner */}
          {agenda.needs_terminalization.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-sm font-semibold text-white">Aksiyon Bekleyen Randevular</h4>
              </div>
              <p className="text-xs text-amber-200/80">
                Saati geçmiş ancak tamamlandı veya gelmedi olarak işaretlenmemiş randevular var.
              </p>
              <div className="divide-y divide-white/5">
                {agenda.needs_terminalization.map((item) => (
                  <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-white">
                        {item.member.first_name} {item.member.last_name}
                      </div>
                      <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-amber-300">
                          {formatWallTime(item.starts_at)} – {formatWallTime(item.ends_at)}
                        </span>
                        {item.session_package && (
                          <span className="text-white/40 truncate">
                            • {item.session_package.package_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/admin/my-appointments"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded transition self-start sm:self-center shrink-0 min-h-[44px]"
                    >
                      Randevularda Yönet
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Timeline */}
          {agenda.appointments.length > 0 ? (
            <div className="bg-[#121212] border border-white/10 rounded-lg p-4 lg:p-5 space-y-3">
              <h4 className="text-sm font-semibold text-white">Günlük Akış</h4>
              <div className="divide-y divide-white/5">
                {agenda.appointments.map((app) => (
                  <div key={app.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded shrink-0">
                        {formatWallTime(app.starts_at)} – {formatWallTime(app.ends_at)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/admin/my-members/${app.member.id}`}
                          className="font-medium text-white hover:text-[#851C35] transition truncate block"
                        >
                          {app.member.first_name} {app.member.last_name}
                        </Link>
                        {app.session_package && (
                          <div className="text-xs text-white/40 truncate">
                            {app.session_package.package_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {app.status === 'scheduled' && (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                            app.temporal_state === 'in_progress'
                              ? 'bg-[#851C35]/20 text-[#851C35] border border-[#851C35]/40'
                              : app.temporal_state === 'past_due'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {APPT_TEMPORAL_LABELS[app.temporal_state] || 'Planlandı'}
                        </span>
                      )}
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                          app.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : app.status === 'cancelled'
                            ? 'bg-white/10 text-white/40'
                            : app.status === 'no_show'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {APPT_STATUS_LABELS[app.status] || app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#121212] border border-white/10 rounded-lg p-6 text-center space-y-3">
              <p className="text-sm text-white/50">
                Bugün planlanmış randevunuz bulunmuyor.
              </p>
              <Link
                to="/admin/my-appointments"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium rounded transition min-h-[44px]"
              >
                Randevulara Git
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
