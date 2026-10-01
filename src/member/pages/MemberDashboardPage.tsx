import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';
import { 
  MemberOverview, 
  MemberSessionPackage, 
  MemberAppointmentsData, 
  MemberTrainingProgram,
  MemberAppointment,
  MemberAppointmentRescheduleOptions,
  MemberRescheduleSlot
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

function formatCardDate(dateStr: string) {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month - 1, day);
  const weekDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const monthsShort = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return {
    weekday: weekDays[d.getDay()] || '',
    dayNum: String(day),
    monthShort: monthsShort[month] || ''
  };
}

const DAY_STATE_LABELS: Record<string, string> = {
  BOOKABLE: 'Uygun',
  MEMBERSHIP_INACTIVE: 'Üyelik dışında',
  PACKAGE_INELIGIBLE: 'Paket geçerli değil',
  NO_WORKING_HOURS: 'Çalışma saati yok',
  FULLY_BOOKED: 'Uygun saat yok'
};

export function MemberDashboardPage() {
  const { identity, isLoading, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<MemberOverview | null>(null);
  const [packages, setPackages] = useState<MemberSessionPackage[] | null>(null);
  const [appointments, setAppointments] = useState<MemberAppointmentsData | null>(null);
  const [programs, setPrograms] = useState<MemberTrainingProgram[] | null>(null);
  
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Success Feedback
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = useState<MemberAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState<boolean>(false);
  const cancelSubmitLockRef = useRef<boolean>(false);
  const cancelAbortRef = useRef<AbortController | null>(null);

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<MemberAppointment | null>(null);
  const [rescheduleOptions, setRescheduleOptions] = useState<MemberAppointmentRescheduleOptions | null>(null);
  const [isOptionsLoading, setIsOptionsLoading] = useState<boolean>(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [selectedRescheduleDate, setSelectedRescheduleDate] = useState<string | null>(null);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<MemberRescheduleSlot | null>(null);
  const [isRescheduleSubmitting, setIsRescheduleSubmitting] = useState<boolean>(false);
  const [rescheduleSubmitError, setRescheduleSubmitError] = useState<string | null>(null);
  const rescheduleSubmitLockRef = useRef<boolean>(false);
  const rescheduleOptionsAbortRef = useRef<AbortController | null>(null);
  const rescheduleSubmitAbortRef = useRef<AbortController | null>(null);
  const rescheduleGenerationRef = useRef<number>(0);

  const dataAbortRef = useRef<AbortController | null>(null);

  const startDataLoad = useCallback(async () => {
    dataAbortRef.current?.abort();

    const controller = new AbortController();
    dataAbortRef.current = controller;

    try {
      setIsDataLoading(true);
      setDataError(null);

      const signal = controller.signal;

      const [o, p, a, t] = await Promise.all([
        memberApiClient.getOverview(signal),
        memberApiClient.getSessionPackages(signal),
        memberApiClient.getAppointments(signal),
        memberApiClient.getTrainingPrograms(signal)
      ]);

      if (signal.aborted) return;

      setOverview(o);
      setPackages(p);
      setAppointments(a);
      setPrograms(t);
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof MemberApiError && err.code === 'PASSWORD_CHANGE_REQUIRED') {
        await refreshIdentity();
        navigate('/uye/sifre-degistir', { replace: true });
        return;
      }
      
      setDataError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      if (!controller.signal.aborted) {
        setIsDataLoading(false);
      }
    }
  }, [navigate, refreshIdentity]);

  useEffect(() => {
    if (!isLoading && identity && !identity.account.must_change_password) {
      void startDataLoad();
      return () => {
        dataAbortRef.current?.abort();
      };
    }
  }, [isLoading, identity, startDataLoad]);

  useEffect(() => {
    return () => {
      cancelAbortRef.current?.abort();
      rescheduleOptionsAbortRef.current?.abort();
      rescheduleSubmitAbortRef.current?.abort();
    };
  }, []);

  // Cancel Handlers
  const handleOpenCancel = (app: MemberAppointment) => {
    setActionSuccessMessage(null);
    setCancelTarget(app);
    setCancelReason('');
    setCancelError(null);
  };

  const handleCloseCancel = () => {
    if (isCancelSubmitting) return;
    cancelAbortRef.current?.abort();
    cancelSubmitLockRef.current = false;
    setCancelTarget(null);
    setCancelReason('');
    setCancelError(null);
  };

  const handleSubmitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || isCancelSubmitting || cancelSubmitLockRef.current) return;

    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setCancelError('Lütfen iptal nedenini yazın.');
      return;
    }

    cancelSubmitLockRef.current = true;
    setIsCancelSubmitting(true);
    setCancelError(null);

    const controller = new AbortController();
    cancelAbortRef.current = controller;

    try {
      await memberApiClient.cancelAppointment(cancelTarget.id, trimmed, controller.signal);
      setCancelTarget(null);
      setCancelReason('');
      setActionSuccessMessage('Randevu iptal edildi.');
      await startDataLoad();
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof MemberApiError) {
        if (err.code === 'APPOINTMENT_NOT_CANCELLABLE') {
          setCancelError('Bu randevu artık iptal edilemiyor.');
        } else if (err.code === 'SESSION_PACKAGE_LEDGER_INCONSISTENT') {
          setCancelError('Randevu paket kaydı doğrulanamadı. Lütfen salonla iletişime geçin.');
        } else if (err.code === 'PASSWORD_CHANGE_REQUIRED') {
          await refreshIdentity();
          navigate('/uye/sifre-degistir', { replace: true });
          return;
        } else {
          setCancelError(err.message || 'Randevu iptal edilirken bir hata oluştu.');
        }
      } else {
        setCancelError('Randevu iptal edilirken bir hata oluştu.');
      }
    } finally {
      cancelSubmitLockRef.current = false;
      setIsCancelSubmitting(false);
    }
  };

  // Reschedule Handlers
  const loadRescheduleOptions = useCallback(async (appointmentId: number) => {
    rescheduleOptionsAbortRef.current?.abort();

    const controller = new AbortController();
    rescheduleOptionsAbortRef.current = controller;
    const gen = ++rescheduleGenerationRef.current;

    setIsOptionsLoading(true);
    setOptionsError(null);

    try {
      const opts = await memberApiClient.getAppointmentRescheduleOptions(appointmentId, controller.signal);
      if (gen !== rescheduleGenerationRef.current || controller.signal.aborted) return;

      setRescheduleOptions(opts);
      const firstBookable = opts.days.find(d => d.state === 'BOOKABLE');
      setSelectedRescheduleDate(firstBookable ? firstBookable.date : null);
      setSelectedRescheduleSlot(null);
    } catch (err) {
      if (gen !== rescheduleGenerationRef.current || controller.signal.aborted) return;

      if (err instanceof MemberApiError && err.code === 'PASSWORD_CHANGE_REQUIRED') {
        await refreshIdentity();
        navigate('/uye/sifre-degistir', { replace: true });
        return;
      }
      setOptionsError('Uygun saatler yüklenirken bir hata oluştu.');
    } finally {
      if (gen === rescheduleGenerationRef.current && !controller.signal.aborted) {
        setIsOptionsLoading(false);
      }
    }
  }, [navigate, refreshIdentity]);

  const handleOpenReschedule = (app: MemberAppointment) => {
    setActionSuccessMessage(null);
    setRescheduleTarget(app);
    setRescheduleOptions(null);
    setSelectedRescheduleDate(null);
    setSelectedRescheduleSlot(null);
    setRescheduleSubmitError(null);
    void loadRescheduleOptions(app.id);
  };

  const handleCloseReschedule = () => {
    if (isRescheduleSubmitting) return;
    rescheduleOptionsAbortRef.current?.abort();
    rescheduleSubmitAbortRef.current?.abort();
    rescheduleSubmitLockRef.current = false;
    setRescheduleTarget(null);
    setRescheduleOptions(null);
    setSelectedRescheduleDate(null);
    setSelectedRescheduleSlot(null);
    setRescheduleSubmitError(null);
    setOptionsError(null);
  };

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !selectedRescheduleSlot || isRescheduleSubmitting || rescheduleSubmitLockRef.current) return;

    rescheduleSubmitLockRef.current = true;
    setIsRescheduleSubmitting(true);
    setRescheduleSubmitError(null);

    const controller = new AbortController();
    rescheduleSubmitAbortRef.current = controller;

    try {
      await memberApiClient.rescheduleAppointment(
        rescheduleTarget.id,
        selectedRescheduleSlot.starts_at,
        controller.signal
      );
      setRescheduleTarget(null);
      setSelectedRescheduleDate(null);
      setSelectedRescheduleSlot(null);
      setRescheduleOptions(null);
      setActionSuccessMessage('Randevu yeniden planlandı.');
      await startDataLoad();
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof MemberApiError) {
        if (err.code === 'TRAINER_CONFLICT' || err.code === 'BOOKING_SLOT_UNAVAILABLE') {
          setRescheduleSubmitError('Seçilen saat artık müsait değil. Lütfen güncellenen saatlerden yeni bir seçim yapın.');
          setSelectedRescheduleSlot(null);
          void loadRescheduleOptions(rescheduleTarget.id);
        } else if (err.code === 'APPOINTMENT_NOT_RESCHEDULABLE') {
          setRescheduleSubmitError('Bu randevu artık yeniden planlanamaz.');
        } else if (err.code === 'APPOINTMENT_RESCHEDULE_NO_CHANGE') {
          setRescheduleSubmitError('Yeni randevu saati mevcut saat ile aynı olamaz.');
        } else if (err.code === 'SESSION_PACKAGE_INELIGIBLE') {
          setRescheduleSubmitError('Seans paketi bu tarih için geçerli değil.');
        } else if (err.code === 'SESSION_PACKAGE_LEDGER_INCONSISTENT') {
          setRescheduleSubmitError('Randevu paket kaydı doğrulanamadı. Lütfen salonla iletişime geçin.');
        } else if (err.code === 'TRAINER_INELIGIBLE') {
          setRescheduleSubmitError('Antrenör müsait değil.');
        } else if (err.code === 'MEMBER_CONFLICT') {
          setRescheduleSubmitError('Bu saatte başka bir randevunuz bulunmaktadır.');
        } else if (err.code === 'PASSWORD_CHANGE_REQUIRED') {
          await refreshIdentity();
          navigate('/uye/sifre-degistir', { replace: true });
          return;
        } else {
          setRescheduleSubmitError(err.message || 'Yeniden planlama sırasında bir hata oluştu.');
        }
      } else {
        setRescheduleSubmitError('Yeniden planlama sırasında bir hata oluştu.');
      }
    } finally {
      rescheduleSubmitLockRef.current = false;
      setIsRescheduleSubmitting(false);
    }
  };

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
          onClick={() => startDataLoad()}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors text-sm font-medium cursor-pointer"
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

      {/* Success Banner */}
      {actionSuccessMessage && (
        <div
          role="status"
          className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm flex items-center justify-between"
        >
          <span>{actionSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-green-400/60 hover:text-green-400 p-1 text-base leading-none cursor-pointer"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
      )}

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

      {/* Measurements CTA */}
      <Link 
        to="/uye/gelisim" 
        className="block bg-gradient-to-r from-[#121212] to-[#1a1a1a] border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 group cursor-pointer"
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-white mb-1">Gelişimim</h2>
            <p className="text-sm text-white/50">Ölçüm geçmişini ve değişimlerini görüntüle.</p>
          </div>
          <div className="text-white/40 group-hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>
      </Link>

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Yaklaşan Randevular</h2>
            <Link
              to="/uye/randevu-al"
              className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-[#851C35] hover:bg-[#851C35]/90 text-white transition-colors"
            >
              Randevu Al
            </Link>
          </div>
          {!appointments?.upcoming || appointments.upcoming.length === 0 ? (
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
              Planlanmış bir randevun bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.upcoming.slice(0, 5).map(app => (
                <div key={app.id} className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center min-w-20 shrink-0">
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

                  {app.status === 'scheduled' && (
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenReschedule(app)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        Yeniden Planla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCancel(app)}
                        className="px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-medium transition-colors cursor-pointer"
                      >
                        İptal Et
                      </button>
                    </div>
                  )}
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

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-semibold text-white">Randevuyu İptal Et</h2>
              <button
                type="button"
                disabled={isCancelSubmitting}
                onClick={handleCloseCancel}
                className="text-white/40 hover:text-white transition-colors disabled:opacity-40 text-xl leading-none cursor-pointer"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/50">Tarih & Saat</span>
                <span className="text-white font-medium">
                  {formatDate(cancelTarget.starts_at)}, {formatTime(cancelTarget.starts_at)} - {formatTime(cancelTarget.ends_at)}
                </span>
              </div>
              {cancelTarget.trainer && (
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Antrenör</span>
                  <span className="text-white font-medium">{cancelTarget.trainer.name}</span>
                </div>
              )}
              {cancelTarget.session_package && (
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Seans Paketi</span>
                  <span className="text-[#851C35] font-medium">{cancelTarget.session_package.package_name}</span>
                </div>
              )}
            </div>

            {cancelError && (
              <div
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
              >
                {cancelError}
              </div>
            )}

            <form onSubmit={handleSubmitCancel} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="cancel-reason" className="text-xs font-medium text-white/70">
                    İptal nedeni
                  </label>
                  <span className="text-[11px] text-white/40">
                    {cancelReason.length}/255
                  </span>
                </div>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  maxLength={255}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="İptal nedeninizi yazın"
                  disabled={isCancelSubmitting}
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-[#851C35] focus:outline-none rounded-xl p-3 text-sm text-white placeholder-white/30 resize-none disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCancelSubmitting}
                  onClick={handleCloseCancel}
                  className="flex-1 min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors text-sm border border-white/10 disabled:opacity-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isCancelSubmitting || !cancelReason.trim()}
                  className="flex-1 min-h-[44px] flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCancelSubmitting ? 'İptal Ediliyor...' : 'Randevuyu İptal Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-semibold text-white">Randevuyu Yeniden Planla</h2>
              <button
                type="button"
                disabled={isRescheduleSubmitting}
                onClick={handleCloseReschedule}
                className="text-white/40 hover:text-white transition-colors disabled:opacity-40 text-xl leading-none cursor-pointer"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            {/* Target Appointment Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/50">Mevcut Randevu</span>
                <span className="text-white font-medium">
                  {formatDate(rescheduleTarget.starts_at)}, {formatTime(rescheduleTarget.starts_at)} - {formatTime(rescheduleTarget.ends_at)}
                </span>
              </div>
              {rescheduleTarget.trainer && (
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Antrenör</span>
                  <span className="text-white font-medium">{rescheduleTarget.trainer.name}</span>
                </div>
              )}
              {rescheduleTarget.session_package && (
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Seans Paketi</span>
                  <span className="text-[#851C35] font-medium">{rescheduleTarget.session_package.package_name}</span>
                </div>
              )}
            </div>

            {/* Submit Error */}
            {rescheduleSubmitError && (
              <div
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
              >
                {rescheduleSubmitError}
              </div>
            )}

            {/* Options Loading */}
            {isOptionsLoading && (
              <div className="p-8 text-center text-white/50 text-sm space-y-2">
                <div className="animate-spin w-5 h-5 border-2 border-[#851C35] border-t-transparent rounded-full mx-auto" />
                <p>Uygun saatler yükleniyor...</p>
              </div>
            )}

            {/* Options Error */}
            {!isOptionsLoading && optionsError && (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-3">
                <p className="text-red-400 text-sm">{optionsError}</p>
                <button
                  type="button"
                  onClick={() => loadRescheduleOptions(rescheduleTarget.id)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {/* Options Loaded */}
            {!isOptionsLoading && rescheduleOptions && (
              <form onSubmit={handleSubmitReschedule} className="space-y-6">
                {/* 1. Date Picker */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-white/70 uppercase tracking-wider block">
                    1. Tarih Seçin
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-2 px-2">
                    {rescheduleOptions.days.map((day) => {
                      const isSelected = selectedRescheduleDate === day.date;
                      const isBookable = day.state === 'BOOKABLE';
                      const card = formatCardDate(day.date);

                      return (
                        <button
                          key={day.date}
                          type="button"
                          disabled={!isBookable || isRescheduleSubmitting}
                          aria-pressed={isSelected}
                          aria-disabled={!isBookable}
                          onClick={() => {
                            setSelectedRescheduleDate(day.date);
                            setSelectedRescheduleSlot(null);
                            setRescheduleSubmitError(null);
                          }}
                          className={`shrink-0 flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center min-w-[70px] min-h-[88px] ${
                            isSelected
                              ? 'bg-[#851C35] text-white border-[#851C35] shadow-lg shadow-[#851C35]/20 scale-[1.02]'
                              : isBookable
                              ? 'bg-[#1a1a1a] text-white/90 border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer'
                              : 'bg-[#121212] text-white/30 border-white/5 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <span className="text-[11px] uppercase tracking-wider font-medium opacity-70">
                            {card.weekday}
                          </span>
                          <span className="text-lg font-bold my-0.5">
                            {card.dayNum}
                          </span>
                          <span className="text-[11px] opacity-70">
                            {card.monthShort}
                          </span>
                          {!isBookable && (
                            <span className="text-[9px] leading-tight text-white/40 mt-1 line-clamp-1 max-w-[62px]">
                              {DAY_STATE_LABELS[day.state] || 'Uygun değil'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Slot Picker */}
                {selectedRescheduleDate && (
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wider block">
                      2. Saat Seçin
                    </label>
                    {(() => {
                      const currentDay = rescheduleOptions.days.find(
                        (d) => d.date === selectedRescheduleDate
                      );
                      if (!currentDay || currentDay.slots.length === 0) {
                        return (
                          <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-white/50 text-xs">
                            Bu tarihte seçilebilir uygun saat bulunmuyor.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {currentDay.slots.map((slot) => {
                            const isSlotSelected =
                              selectedRescheduleSlot?.starts_at === slot.starts_at;

                            return (
                              <button
                                key={slot.starts_at}
                                type="button"
                                disabled={isRescheduleSubmitting}
                                aria-pressed={isSlotSelected}
                                onClick={() => {
                                  setSelectedRescheduleSlot(slot);
                                  setRescheduleSubmitError(null);
                                }}
                                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer min-h-[40px] flex items-center justify-center ${
                                  isSlotSelected
                                    ? 'bg-[#851C35] text-white border-[#851C35] shadow-sm'
                                    : 'bg-[#1a1a1a] text-white/90 border-white/10 hover:border-white/30 hover:bg-white/5'
                                }`}
                              >
                                {formatTime(slot.starts_at)} - {formatTime(slot.ends_at)}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    disabled={isRescheduleSubmitting}
                    onClick={handleCloseReschedule}
                    className="flex-1 min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors text-sm border border-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isRescheduleSubmitting || !selectedRescheduleSlot}
                    className="flex-1 min-h-[44px] flex items-center justify-center bg-[#851C35] hover:bg-[#851C35]/90 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isRescheduleSubmitting ? 'Yeniden Planlanıyor...' : 'Randevuyu Yeniden Planla'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
