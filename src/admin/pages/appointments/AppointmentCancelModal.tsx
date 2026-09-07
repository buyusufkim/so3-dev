import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { AppointmentScope, AppointmentListItem } from './types';

interface AppointmentCancelModalProps {
  scope: AppointmentScope;
  item: AppointmentListItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function AppointmentCancelModal({ scope, item, onClose, onSuccess }: AppointmentCancelModalProps) {
  const [reason, setReason] = useState('');
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

    if (item.appointment.status !== 'scheduled') {
      setSubmitError('Yalnızca planlanmış randevular iptal edilebilir.');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setSubmitError('İptal nedeni boş olamaz.');
      return;
    }
    if (trimmedReason.length > 255) {
      setSubmitError('İptal nedeni 255 karakteri geçemez.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    let endpoint = '';
    if (scope === 'admin') endpoint = `/api/admin/appointments/${item.appointment.id}/cancel`;
    else if (scope === 'reception') endpoint = `/api/reception/appointments/${item.appointment.id}/cancel`;
    
    if (!endpoint) {
       setSubmitError('Bu işlem için yetkiniz yok.');
       submitLockRef.current = false;
       setIsSubmitting(false);
       return;
    }

    try {
      const payload = {
        cancellation_reason: trimmedReason
      };

      const res = await apiClient.patch(endpoint, payload);

      if (!res || typeof res !== 'object' || !res.appointment || typeof res.appointment !== 'object') {
        throw new Error('Invalid response structure');
      }

      const appt = res.appointment;
      if (
          appt.id !== item.appointment.id ||
          appt.uuid !== item.appointment.uuid ||
          appt.member_id !== item.member.id ||
          appt.trainer_id !== item.trainer.id ||
          appt.starts_at !== item.appointment.starts_at ||
          appt.ends_at !== item.appointment.ends_at ||
          appt.status !== 'cancelled'
      ) {
        throw new Error('Malformed or mismatched appointment in response');
      }

      if (mountedRef.current) onSuccess();
    } catch (err: any) {
      console.error(err);
      if (mountedRef.current) {
        let errMsg = 'Randevu iptal edilirken beklenmedik bir hata oluştu.';
        if (err.code) {
          const codeMap: Record<string, string> = {
            'APPOINTMENT_NOT_CANCELLABLE': 'Randevu şu anda iptal edilemez (geçmiş olabilir veya zaten iptal edilmiş).',
            'FORBIDDEN': 'Bu işlemi yapma yetkiniz yok.',
            'NOT_FOUND': 'Randevu bulunamadı.',
            'VALIDATION_ERROR': 'İptal nedeni geçersiz.'
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
      <div role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title" className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 id="cancel-modal-title" className="text-lg font-medium text-white">Randevuyu İptal Et</h2>
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

          <form id="appointment-cancel-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-white/70 text-sm mb-4">
                <strong>{item.member.first_name} {item.member.last_name}</strong> adlı üyenin <strong>{item.appointment.starts_at.substring(11, 16)}</strong> - <strong>{item.appointment.ends_at.substring(11, 16)}</strong> arasındaki randevusunu iptal etmek üzeresiniz.
              </p>
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-white/70 mb-1.5">İptal Nedeni</label>
              <textarea 
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                maxLength={255}
                rows={3}
                className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] disabled:opacity-50 resize-none"
                required
              />
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
            Vazgeç
          </button>
          <button 
            type="submit"
            form="appointment-cancel-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded font-medium text-sm bg-red-600/80 text-white hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            İptal Et
          </button>
        </div>
      </div>
    </div>
  );
}
