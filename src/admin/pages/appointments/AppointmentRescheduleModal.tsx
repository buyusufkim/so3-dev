import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { AppointmentScope, AppointmentListItem } from './types';

interface AppointmentRescheduleModalProps {
  scope: AppointmentScope;
  item: AppointmentListItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function AppointmentRescheduleModal({ scope, item, onClose, onSuccess }: AppointmentRescheduleModalProps) {
  // Extract YYYY-MM-DD from starts_at (which is in YYYY-MM-DD HH:mm:ss format)
  const [date, setDate] = useState(() => item.appointment.starts_at.substring(0, 10));
  const [startTime, setStartTime] = useState(() => item.appointment.starts_at.substring(11, 16));
  const [endTime, setEndTime] = useState(() => item.appointment.ends_at.substring(11, 16));
  // Keep original seconds around just in case, though backend might handle 00
  const originalStartSeconds = useRef(item.appointment.starts_at.substring(16, 19) || ':00');
  const originalEndSeconds = useRef(item.appointment.ends_at.substring(16, 19) || ':00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitLockRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;

    if (!date || !startTime || !endTime) {
      setSubmitError('Lütfen tarih ve saat alanlarını doldurun.');
      return;
    }

    if (startTime >= endTime) {
      setSubmitError('Bitiş saati, başlangıç saatinden sonra olmalıdır.');
      return;
    }

    const newStartsAt = `${date} ${startTime}${originalStartSeconds.current}`;
    const newEndsAt = `${date} ${endTime}${originalEndSeconds.current}`;

    if (newStartsAt === item.appointment.starts_at && newEndsAt === item.appointment.ends_at) {
      setSubmitError('Lütfen farklı bir saat veya tarih seçin.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    let endpoint = '';
    if (scope === 'admin') endpoint = `/api/admin/appointments/${item.appointment.id}/reschedule`;
    else if (scope === 'reception') endpoint = `/api/reception/appointments/${item.appointment.id}/reschedule`;
    else if (scope === 'trainer') endpoint = `/api/trainer/appointments/${item.appointment.id}/reschedule`;

    try {
      const payload = {
        starts_at: newStartsAt,
        ends_at: newEndsAt
      };

      const res = await apiClient.patch(endpoint, payload);

      if (!res || typeof res !== 'object' || !res.appointment || typeof res.appointment !== 'object') {
        throw new Error('Invalid response structure');
      }

      const appt = res.appointment;
      if (typeof appt.id !== 'number' || !Number.isInteger(appt.id) || appt.id <= 0 ||
          typeof appt.uuid !== 'string' || !appt.uuid ||
          typeof appt.member_id !== 'number' || !Number.isInteger(appt.member_id) || appt.member_id <= 0 ||
          typeof appt.trainer_id !== 'number' || !Number.isInteger(appt.trainer_id) || appt.trainer_id <= 0 ||
          typeof appt.starts_at !== 'string' || !appt.starts_at ||
          typeof appt.ends_at !== 'string' || !appt.ends_at ||
          appt.status !== 'scheduled' ||
          appt.id !== item.appointment.id) {
        throw new Error('Malformed or mismatched appointment in response');
      }

      if (mountedRef.current) onSuccess();
    } catch (err: any) {
      console.error(err);
      if (mountedRef.current) {
        let errMsg = 'Randevu güncellenirken beklenmedik bir hata oluştu.';
        if (err.code) {
          const codeMap: Record<string, string> = {
            'MEMBER_CONFLICT': 'Üyenin bu saat aralığında başka bir randevusu var.',
            'TRAINER_CONFLICT': 'Eğitmenin bu saat aralığında başka bir randevusu var.',
            'MEMBER_INELIGIBLE': 'Üye bu tarih için randevuya uygun değil.',
            'TRAINER_INELIGIBLE': 'Eğitmen aktif değil.',
            'APPOINTMENT_NOT_RESCHEDULABLE': 'Bu randevu yeniden planlanamaz.',
            'APPOINTMENT_CHANGED': 'Randevu değiştirildi.',
            'TRAINER_PROFILE_NOT_LINKED': 'Eğitmen profili bağlı değil.',
            'FORBIDDEN': 'Bu işlemi yapma yetkiniz yok.',
            'NOT_FOUND': 'Randevu bulunamadı.',
            'VALIDATION_ERROR': 'Randevu bilgileri geçersiz.'
          };
          if (codeMap[err.code]) {
            errMsg = codeMap[err.code];
          }
        }
        setSubmitError(errMsg);
      }
    } finally {
      submitLockRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="reschedule-modal-title" className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 id="reschedule-modal-title" className="text-lg font-medium text-white">Yeniden Planla</h2>
          <button 
            onClick={() => { if (!isSubmitting) onClose(); }}
            disabled={isSubmitting}
            className="text-white/50 hover:text-white transition disabled:opacity-50"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {submitError && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-sm">
              {submitError}
            </div>
          )}

          <form id="appointment-reschedule-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Üye</label>
              <div className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white/50 text-sm">
                {item.member.first_name} {item.member.last_name}
              </div>
            </div>

            {scope !== 'trainer' && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Eğitmen</label>
                <div className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white/50 text-sm">
                  {item.trainer.name}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="reschedule-date" className="block text-sm font-medium text-white/70 mb-1.5">Tarih</label>
              <input 
                id="reschedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] disabled:opacity-50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reschedule-start-time" className="block text-sm font-medium text-white/70 mb-1.5">Başlangıç Saati</label>
                <input 
                  id="reschedule-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label htmlFor="reschedule-end-time" className="block text-sm font-medium text-white/70 mb-1.5">Bitiş Saati</label>
                <input 
                  id="reschedule-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] disabled:opacity-50"
                  required
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-black/20">
          <button 
            type="button"
            onClick={() => { if (!isSubmitting) onClose(); }}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded font-medium text-sm text-white/70 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
          >
            İptal
          </button>
          <button 
            type="submit"
            form="appointment-reschedule-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded font-medium text-sm bg-[#851C35] text-white hover:bg-[#6a162a] transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
