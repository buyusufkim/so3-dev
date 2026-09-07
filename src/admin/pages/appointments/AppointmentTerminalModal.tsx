import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { AppointmentScope, AppointmentListItem } from './types';

interface AppointmentTerminalModalProps {
  scope: AppointmentScope;
  item: AppointmentListItem;
  action: 'completed' | 'no_show';
  onClose: () => void;
  onSuccess: () => void;
}

export function AppointmentTerminalModal({ scope, item, action, onClose, onSuccess }: AppointmentTerminalModalProps) {
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
      setSubmitError('Yalnızca planlanmış randevular güncellenebilir.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    let endpoint = '';
    const routeAction = action === 'completed' ? 'complete' : 'no-show';
    
    if (scope === 'admin') endpoint = `/api/admin/appointments/${item.appointment.id}/${routeAction}`;
    else if (scope === 'trainer') endpoint = `/api/trainer/appointments/${item.appointment.id}/${routeAction}`;
    
    if (!endpoint) {
       setSubmitError('Bu işlem için yetkiniz yok.');
       submitLockRef.current = false;
       setIsSubmitting(false);
       return;
    }

    try {
      const res = await apiClient.patch(endpoint, {});

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
          appt.status !== action
      ) {
        throw new Error('Malformed or mismatched appointment in response');
      }

      if (mountedRef.current) onSuccess();
    } catch (err: any) {
      console.error(err);
      if (mountedRef.current) {
        let errMsg = 'Randevu güncellenirken beklenmedik bir hata oluştu.';
        if (err.code) {
          const codeMap: Record<string, string> = {
            'APPOINTMENT_NOT_COMPLETABLE': 'Randevu tamamlanamaz veya henüz saati geçmedi.',
            'FORBIDDEN': 'Bu işlemi yapma yetkiniz yok.',
            'NOT_FOUND': 'Randevu bulunamadı.',
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

  const actionTitle = action === 'completed' ? 'Randevuyu Tamamla' : 'Gelmedi Olarak İşaretle';
  const buttonColor = action === 'completed' ? 'bg-green-600/80 hover:bg-green-600' : 'bg-orange-600/80 hover:bg-orange-600';
  const buttonText = action === 'completed' ? 'Tamamla' : 'İşaretle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="terminal-modal-title" className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 id="terminal-modal-title" className="text-lg font-medium text-white">{actionTitle}</h2>
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

          <form id="appointment-terminal-form" onSubmit={handleSubmit} className="space-y-6">
            <p className="text-white/70 text-sm">
              <strong>{item.member.first_name} {item.member.last_name}</strong> adlı üyenin <strong>{item.appointment.starts_at.substring(11, 16)}</strong> - <strong>{item.appointment.ends_at.substring(11, 16)}</strong> arasındaki randevusunu <strong>{action === 'completed' ? 'tamamlandı' : 'gelmedi'}</strong> olarak işaretlemek üzeresiniz. Bu işlem geri alınamaz.
            </p>
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
            form="appointment-terminal-form"
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded font-medium text-sm text-white transition disabled:opacity-50 flex items-center gap-2 ${buttonColor}`}
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
