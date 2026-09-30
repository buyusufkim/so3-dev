import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';
import {
  MemberAppointmentBookingOptions,
  MemberBookingDay,
  MemberBookingSlot,
  MemberBookingPackage,
  MemberCreatedAppointment
} from '../api/validators';
import { Calendar, Clock, Package, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, User } from 'lucide-react';

const SHORT_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const FULL_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const SHORT_WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const FULL_WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function getWeekdayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const adjY = m < 3 ? y - 1 : y;
  return (adjY + Math.floor(adjY / 4) - Math.floor(adjY / 100) + Math.floor(adjY / 400) + t[m - 1] + d) % 7;
}

function formatCardDate(dateStr: string): { weekday: string; dayNum: string; monthShort: string } {
  const [, m, d] = dateStr.split('-');
  const dow = getWeekdayIndex(dateStr);
  const mIdx = parseInt(m, 10) - 1;
  return {
    weekday: SHORT_WEEKDAYS[dow],
    dayNum: String(parseInt(d, 10)),
    monthShort: SHORT_MONTHS[mIdx] || ''
  };
}

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const dow = getWeekdayIndex(dateStr);
  const mIdx = parseInt(m, 10) - 1;
  const dayNum = parseInt(d, 10);
  const monthName = FULL_MONTHS[mIdx] || '';
  const weekdayName = FULL_WEEKDAYS[dow];
  return `${dayNum} ${monthName} ${y}, ${weekdayName}`;
}

function formatTimeRange(startsAt: string, endsAt: string): string {
  const startH = startsAt.substring(11, 16);
  const endH = endsAt.substring(11, 16);
  return `${startH} – ${endH}`;
}

const DAY_STATE_LABELS: Record<string, string> = {
  MEMBERSHIP_INACTIVE: 'Üyelik dışında',
  NO_WORKING_HOURS: 'Çalışma saati yok',
  NO_ELIGIBLE_PACKAGE: 'Kullanılabilir paket yok',
  FULLY_BOOKED: 'Dolu'
};

export function MemberAppointmentBookingPage() {
  const { identity, isLoading: authLoading, isAuthenticated, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();

  const [options, setOptions] = useState<MemberAppointmentBookingOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MemberBookingSlot | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState<MemberCreatedAppointment | null>(null);

  const optionsAbortRef = useRef<AbortController | null>(null);
  const requestGenRef = useRef<number>(0);
  const submitLockRef = useRef<boolean>(false);
  const submitAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchBookingOptions = useCallback(async () => {
    if (optionsAbortRef.current) {
      optionsAbortRef.current.abort();
    }
    const controller = new AbortController();
    optionsAbortRef.current = controller;

    requestGenRef.current += 1;
    const currentGen = requestGenRef.current;

    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }

    try {
      const data = await memberApiClient.getAppointmentBookingOptions(controller.signal);
      if (currentGen !== requestGenRef.current || !mountedRef.current || controller.signal.aborted) {
        return;
      }
      setOptions(data);

      // Auto-select first BOOKABLE day if available
      if (data.booking_state === 'READY') {
        setSelectedDate(prevDate => {
          const matchingDay = data.days.find(d => d.date === prevDate && d.state === 'BOOKABLE');
          if (matchingDay) {
            return prevDate;
          }
          const firstBookable = data.days.find(d => d.state === 'BOOKABLE');
          return firstBookable ? firstBookable.date : null;
        });
      } else {
        setSelectedDate(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (currentGen === requestGenRef.current && mountedRef.current) {
        setLoadError('Randevu saatleri yüklenemedi.');
      }
    } finally {
      if (currentGen === requestGenRef.current && mountedRef.current) {
        setLoading(false);
      }
      if (optionsAbortRef.current === controller) {
        optionsAbortRef.current = null;
      }
    }
  }, []);

  // Dedicated mount tracking lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auth-ready booking options fetch effect
  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !identity ||
      identity.account.must_change_password
    ) {
      return;
    }

    void fetchBookingOptions();

    return () => {
      requestGenRef.current += 1;
      if (optionsAbortRef.current) {
        optionsAbortRef.current.abort();
        optionsAbortRef.current = null;
      }
      if (submitAbortRef.current) {
        submitAbortRef.current.abort();
        submitAbortRef.current = null;
      }
    };
  }, [
    authLoading,
    isAuthenticated,
    identity,
    fetchBookingOptions
  ]);

  // Handle selected day changes (auto-select single eligible package)
  const currentDay: MemberBookingDay | null =
    options && options.booking_state === 'READY' && selectedDate
      ? options.days.find(d => d.date === selectedDate) || null
      : null;

  useEffect(() => {
    if (!currentDay || currentDay.state !== 'BOOKABLE') {
      setSelectedSlot(null);
      setSelectedPackageId(null);
      return;
    }

    // If exactly one package, auto-select it; if multiple, user selects explicitly
    if (currentDay.eligible_packages.length === 1) {
      setSelectedPackageId(currentDay.eligible_packages[0].id);
    } else {
      setSelectedPackageId(prev => {
        if (prev && currentDay.eligible_packages.some(p => p.id === prev)) {
          return prev;
        }
        return null;
      });
    }

    // Clear slot if no longer present in current day
    setSelectedSlot(prev => {
      if (prev && currentDay.slots.some(s => s.starts_at === prev.starts_at)) {
        return prev;
      }
      return null;
    });
  }, [currentDay]);

  const handleDateSelect = (dateStr: string) => {
    if (dateStr === selectedDate) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSelectedPackageId(null);
    setSubmitError(null);
  };

  const handleSlotSelect = (slot: MemberBookingSlot) => {
    setSelectedSlot(slot);
    setSubmitError(null);
  };

  const handlePackageSelect = (pkgId: number) => {
    setSelectedPackageId(pkgId);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;
    if (!selectedSlot || !selectedPackageId || !options || options.booking_state !== 'READY') return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    const controller = new AbortController();
    submitAbortRef.current = controller;

    try {
      const res = await memberApiClient.createAppointment(
        selectedSlot.starts_at,
        selectedPackageId,
        controller.signal
      );

      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      // Successful creation
      if (mountedRef.current && !controller.signal.aborted) {
        setCreatedSuccess(res);
        setSelectedSlot(null);
        setSelectedPackageId(null);
      }

      // Immediately refetch booking options to refresh server authority
      if (mountedRef.current && !controller.signal.aborted) {
        await fetchBookingOptions();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      if (err instanceof MemberApiError) {
        if (err.code === 'BOOKING_SLOT_UNAVAILABLE') {
          if (mountedRef.current) {
            setSubmitError('Seçtiğin saat artık uygun değil. Müsait saatler yenilendi.');
            setSelectedSlot(null);
            setSelectedPackageId(null);
          }
          if (mountedRef.current && !controller.signal.aborted) {
            await fetchBookingOptions();
          }
        } else if (err.code === 'TRAINER_CONFLICT' || err.code === 'MEMBER_CONFLICT') {
          if (mountedRef.current) {
            setSubmitError('Bu saat artık kullanılamıyor. Müsait saatler yenilendi.');
            setSelectedSlot(null);
          }
          if (mountedRef.current && !controller.signal.aborted) {
            await fetchBookingOptions();
          }
        } else if (err.code === 'SESSION_PACKAGE_EXHAUSTED' || err.code === 'SESSION_PACKAGE_INELIGIBLE') {
          if (mountedRef.current) {
            setSubmitError('Seçtiğin seans paketi artık kullanılamıyor. Paketler yenilendi.');
            setSelectedPackageId(null);
          }
          if (mountedRef.current && !controller.signal.aborted) {
            await fetchBookingOptions();
          }
        } else if (err.code === 'SESSION_PACKAGE_LEDGER_INCONSISTENT') {
          if (mountedRef.current) {
            setSubmitError('Seans paketi bilgileri şu anda doğrulanamıyor. Lütfen resepsiyonla iletişime geç.');
          }
        } else if (err.code === 'TRAINER_NOT_ASSIGNED' || err.code === 'TRAINER_INELIGIBLE') {
          if (mountedRef.current && !controller.signal.aborted) {
            await fetchBookingOptions();
          }
        } else if (err.code === 'MEMBER_INELIGIBLE' || err.code === 'MEMBER_MEMBERSHIP_DATA_INCONSISTENT') {
          if (mountedRef.current) {
            setSubmitError('Üyelik durumunuz randevu almak için uygun değil.');
          }
          if (mountedRef.current && !controller.signal.aborted) {
            await fetchBookingOptions();
          }
        } else if (err.code === 'PASSWORD_CHANGE_REQUIRED') {
          await refreshIdentity();
          if (mountedRef.current) {
            navigate('/uye/sifre-degistir', { replace: true });
          }
          return;
        } else {
          if (mountedRef.current) {
            setSubmitError(err.message || 'Randevu oluşturulamadı. Lütfen tekrar dene.');
          }
        }
      } else {
        if (mountedRef.current) {
          setSubmitError('Randevu oluşturulamadı. Lütfen tekrar dene.');
        }
      }
    } finally {
      submitLockRef.current = false;

      if (submitAbortRef.current === controller) {
        submitAbortRef.current = null;
      }

      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Auth gate checks
  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-white/50 text-sm">
        Yükleniyor...
      </div>
    );
  }

  if (!isAuthenticated || !identity) {
    return <Navigate to="/uye/giris" replace />;
  }

  if (identity.account.must_change_password) {
    return <Navigate to="/uye/sifre-degistir" replace />;
  }

  // Success view
  if (createdSuccess) {
    const sDate = createdSuccess.starts_at.substring(0, 10);
    return (
      <div className="max-w-xl mx-auto space-y-6 py-6">
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Randevun oluşturuldu.</h1>
            <p className="text-white/50 text-sm mt-1">Randevu detayların aşağıda yer almaktadır.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">Antrenör</span>
              <span className="text-white font-medium">{createdSuccess.trainer.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">Tarih</span>
              <span className="text-white font-medium">{formatFullDate(sDate)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/50">Saat</span>
              <span className="text-white font-medium">
                {formatTimeRange(createdSuccess.starts_at, createdSuccess.ends_at)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
              <span className="text-white/50">Seans Paketi</span>
              <span className="text-[#851C35] font-medium">{createdSuccess.session_package.package_name}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/uye"
              className="flex-1 min-h-[44px] flex items-center justify-center bg-[#851C35] hover:bg-[#851C35]/90 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Randevularıma Dön
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedSuccess(null);
                setSelectedSlot(null);
                setSelectedPackageId(null);
              }}
              className="flex-1 min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors text-sm border border-white/10"
            >
              Yeni Randevu Al
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          to="/uye"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Randevu Al</h1>
            <p className="text-white/50 text-sm mt-0.5">Antrenörünün uygun saatlerinden sana uygun olanı seç.</p>
          </div>
          {options?.booking_state === 'READY' && options.trainer && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 self-start sm:self-auto">
              <User className="w-4 h-4 text-[#851C35]" />
              <span>Antrenörün: <strong className="text-white">{options.trainer.name}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-12 text-center text-white/50 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#851C35]" />
          <span>Randevu seçenekleri yükleniyor...</span>
        </div>
      )}

      {/* Error state */}
      {!loading && loadError && (
        <div className="bg-[#121212] border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-white/90 text-sm font-medium">{loadError}</div>
          <button
            type="button"
            onClick={fetchBookingOptions}
            className="px-5 py-2.5 bg-[#851C35] hover:bg-[#851C35]/90 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tekrar Dene</span>
          </button>
        </div>
      )}

      {/* Top-Level Non-Ready States */}
      {!loading && !loadError && options && options.booking_state !== 'READY' && (
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-white/5 text-white/50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-white/90 text-sm leading-relaxed">
            {options.booking_state === 'MEMBERSHIP_NOT_SET' && (
              'Randevu alabilmek için üyelik başlangıç ve bitiş tarihlerinin tanımlanması gerekiyor.'
            )}
            {options.booking_state === 'TRAINER_NOT_ASSIGNED' && (
              'Henüz sana atanmış bir antrenör bulunmuyor.'
            )}
            {options.booking_state === 'TRAINER_UNAVAILABLE' && (
              'Atanmış antrenörün şu anda randevu kabul etmiyor.'
            )}
          </div>
          <Link
            to="/uye"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors border border-white/10 min-h-[44px]"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      )}

      {/* READY State - Main Booking Flow */}
      {!loading && !loadError && options && options.booking_state === 'READY' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {submitError && (
            <div
              role="alert"
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: Date Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-medium text-base sm:text-lg">
              <Calendar className="w-5 h-5 text-[#851C35]" />
              <span>1. Tarih Seç</span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {options.days.map(day => {
                const isSelected = selectedDate === day.date;
                const isBookable = day.state === 'BOOKABLE';
                const card = formatCardDate(day.date);

                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={!isBookable}
                    aria-pressed={isSelected}
                    aria-disabled={!isBookable}
                    onClick={() => handleDateSelect(day.date)}
                    className={`shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center min-w-[76px] sm:min-w-[84px] min-h-[96px] ${
                      isSelected
                        ? 'bg-[#851C35] text-white border-[#851C35] shadow-lg shadow-[#851C35]/20 scale-[1.02]'
                        : isBookable
                        ? 'bg-[#121212] text-white/90 border-white/10 hover:border-white/30 hover:bg-white/5 cursor-pointer'
                        : 'bg-[#121212]/50 text-white/30 border-white/5 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-medium opacity-70">
                      {card.weekday}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold my-0.5">
                      {card.dayNum}
                    </span>
                    <span className="text-xs opacity-70">
                      {card.monthShort}
                    </span>
                    {!isBookable && (
                      <span className="text-[9px] leading-tight text-white/40 mt-1 line-clamp-1 max-w-[68px]">
                        {DAY_STATE_LABELS[day.state] || 'Uygun değil'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && currentDay && (
              <div className="text-xs text-white/50 pl-1">
                Seçilen Gün: <strong className="text-white/80">{formatFullDate(selectedDate)}</strong>
              </div>
            )}
          </div>

          {/* STEP 2: Slot Picker */}
          {currentDay && currentDay.state === 'BOOKABLE' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-white font-medium text-base sm:text-lg">
                <Clock className="w-5 h-5 text-[#851C35]" />
                <span>2. Saat Seç</span>
              </div>

              {currentDay.slots.length === 0 ? (
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
                  Bu tarihte müsait saat bulunmuyor.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {currentDay.slots.map(slot => {
                    const isSelected = selectedSlot?.starts_at === slot.starts_at;
                    return (
                      <button
                        key={slot.starts_at}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleSlotSelect(slot)}
                        className={`min-h-[48px] px-4 py-3 rounded-xl border font-medium text-sm transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#851C35] text-white border-[#851C35] shadow-md shadow-[#851C35]/20'
                            : 'bg-[#121212] text-white/90 border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                      >
                        {formatTimeRange(slot.starts_at, slot.ends_at)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Package Picker */}
          {currentDay && currentDay.state === 'BOOKABLE' && selectedSlot && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-medium text-base sm:text-lg">
                  <Package className="w-5 h-5 text-[#851C35]" />
                  <span>3. Seans Paketi Seç</span>
                </div>
                {currentDay.eligible_packages.length === 1 && (
                  <span className="text-xs text-white/50">Otomatik seçildi</span>
                )}
              </div>

              {currentDay.eligible_packages.length === 0 ? (
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 text-center text-white/50 text-sm">
                  Bu tarih için geçerli bir seans paketin bulunmuyor.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentDay.eligible_packages.map(pkg => {
                    const isSelected = selectedPackageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handlePackageSelect(pkg.id)}
                        className={`min-h-[64px] p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-white/10 text-white border-[#851C35] ring-1 ring-[#851C35]'
                            : 'bg-[#121212] text-white/80 border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-white text-sm sm:text-base">
                            {pkg.package_name}
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            {pkg.valid_until ? `${pkg.valid_until} tarihine kadar geçerli` : 'Süresiz'}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[#851C35]/20 text-[#851C35] border border-[#851C35]/30">
                            {pkg.remaining_sessions} seans kaldı
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Randevu Özeti & Onay */}
          {selectedDate && selectedSlot && selectedPackageId && currentDay && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
                <h2 className="text-base font-semibold text-white uppercase tracking-wider text-xs">Randevu Özeti</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-white/40 text-xs mb-1">Antrenör</div>
                    <div className="text-white font-medium">{options.trainer?.name}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-1">Tarih</div>
                    <div className="text-white font-medium">{formatFullDate(selectedDate)}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-1">Saat</div>
                    <div className="text-white font-medium">
                      {formatTimeRange(selectedSlot.starts_at, selectedSlot.ends_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-1">Seans Paketi</div>
                    <div className="text-[#851C35] font-medium">
                      {currentDay.eligible_packages.find(p => p.id === selectedPackageId)?.package_name || '-'}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-[#851C35] hover:bg-[#851C35]/90 text-white font-medium text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#851C35]/20"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Randevu Onaylanıyor...</span>
                      </>
                    ) : (
                      <span>Randevuyu Onayla</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
