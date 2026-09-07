import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../../api/client';
import { AppointmentScope } from './types';

interface AppointmentCreateModalProps {
  scope: AppointmentScope;
  selectedDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: () => void;
}

interface MemberOption {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
}

interface TrainerOption {
  id: number;
  name: string;
  is_active?: boolean; // For admin endpoint
}

export function AppointmentCreateModal({ scope, selectedDate, onClose, onSuccess }: AppointmentCreateModalProps) {
  const [memberSearch, setMemberSearch] = useState('');
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState<string | null>(null);
  
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | ''>('');
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(false);
  const [trainerError, setTrainerError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const searchGenerationRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const trainersAbortControllerRef = useRef<AbortController | null>(null);

  const submitLockRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const trainersGenerationRef = useRef(0);

  // Fetch trainers on mount
  const loadTrainers = useCallback(async () => {
    if (scope === 'trainer') return; // No trainer picker for trainer scope

    trainersGenerationRef.current += 1;
    const localGen = trainersGenerationRef.current;

    if (trainersAbortControllerRef.current) {
      trainersAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    trainersAbortControllerRef.current = abortController;

    setIsLoadingTrainers(true);
    setTrainerError(null);

    let endpoint = '';
    if (scope === 'admin') endpoint = '/api/admin/trainers';
    else if (scope === 'reception') endpoint = '/api/reception/appointment-trainers';

    try {
      const response = await apiClient.get(endpoint, { signal: abortController.signal });
      
      if (abortController.signal.aborted || localGen !== trainersGenerationRef.current) return;

      let validTrainers: TrainerOption[] = [];
      
      // Runtime validation based on endpoint
      if (scope === 'admin') {
         if (!response || typeof response !== 'object' || !Array.isArray((response as any).items)) {
           throw new Error('Invalid trainers response');
         }
         for (const t of (response as any).items) {
           if (t && typeof t.id === 'number' && Number.isInteger(t.id) && t.id > 0 && typeof t.name === 'string' && t.name.trim() !== '' && typeof t.is_active === 'boolean') {
             if (t.is_active) {
               validTrainers.push({ id: t.id, name: t.name });
             }
           } else {
             throw new Error('Malformed trainer item');
           }
         }
      } else if (scope === 'reception') {
         if (!response || typeof response !== 'object' || !Array.isArray((response as any).items)) {
           throw new Error('Invalid trainers response');
         }
         for (const t of (response as any).items) {
           if (t && typeof t.id === 'number' && Number.isInteger(t.id) && t.id > 0 && typeof t.name === 'string' && t.name.trim() !== '') {
             validTrainers.push({ id: t.id, name: t.name });
           } else {
             throw new Error('Malformed trainer item');
           }
         }
      }
      
      if (mountedRef.current) setTrainers(validTrainers);
    } catch (err: any) {
      if (abortController.signal.aborted || localGen !== trainersGenerationRef.current) return;
      console.error(err);
      if (mountedRef.current) setTrainerError('Eğitmen listesi yüklenemedi.');
    } finally {
      if (!abortController.signal.aborted && localGen === trainersGenerationRef.current) {
        if (mountedRef.current) setIsLoadingTrainers(false);
      }
    }
  }, [scope]);

  useEffect(() => {
    loadTrainers();
    return () => {
      trainersGenerationRef.current += 1;
      if (trainersAbortControllerRef.current) {
        trainersAbortControllerRef.current.abort();
      }
    };
  }, [loadTrainers]);

  // Handle member search
  const performSearch = useCallback(async (query: string) => {
    searchGenerationRef.current += 1;
    const localGeneration = searchGenerationRef.current;

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setMemberOptions([]);
      setIsSearchingMembers(false);
      setMemberSearchError(null);
      return;
    }

    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    setIsSearchingMembers(true);
    setMemberSearchError(null);

    let url = '';
    if (scope === 'admin') {
      url = `/api/admin/members?q=${encodeURIComponent(trimmedQuery)}&status=active&deleted=active&page=1&per_page=20`;
    } else if (scope === 'reception') {
      url = `/api/reception/members?q=${encodeURIComponent(trimmedQuery)}`;
    } else if (scope === 'trainer') {
      url = `/api/trainer/members?q=${encodeURIComponent(trimmedQuery)}&status=active&page=1&per_page=20`;
    }

    try {
      const response = await apiClient.get(url, { signal: abortController.signal });
      
      if (localGeneration === searchGenerationRef.current && !abortController.signal.aborted) {
        if (!response || typeof response !== 'object' || !Array.isArray((response as any).items)) {
          throw new Error('Invalid members response');
        }
        let validMembers: MemberOption[] = [];
        for (const m of (response as any).items) {
           if (m && typeof m.id === 'number' && Number.isInteger(m.id) && m.id > 0 && 
               typeof m.first_name === 'string' && typeof m.last_name === 'string' && typeof m.status === 'string') {
             if (m.status === 'active') {
               validMembers.push({
                 id: m.id,
                 first_name: m.first_name,
                 last_name: m.last_name,
                 status: m.status
               });
             }
           } else {
             throw new Error('Malformed member item');
           }
        }
        setMemberOptions(validMembers);
      }
    } catch (err: any) {
      if (abortController.signal.aborted || localGeneration !== searchGenerationRef.current) return;
      console.error(err);
      if (mountedRef.current) setMemberSearchError('Üye araması başarısız oldu.');
    } finally {
      if (localGeneration === searchGenerationRef.current && !abortController.signal.aborted) {
        if (mountedRef.current) setIsSearchingMembers(false);
      }
    }
  }, [scope]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (memberSearch.trim().length >= 2) {
      debounceTimeoutRef.current = setTimeout(() => {
        performSearch(memberSearch);
      }, 300);
    } else {
      performSearch(memberSearch);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [memberSearch, performSearch]);

  useEffect(() => {
    return () => {
      searchGenerationRef.current += 1;
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;

    // Client side validation
    if (!selectedMemberId || typeof selectedMemberId !== 'number' || !Number.isInteger(selectedMemberId) || selectedMemberId <= 0 ||
        (!selectedTrainerId && scope !== 'trainer') || (scope !== 'trainer' && (typeof selectedTrainerId !== 'number' || !Number.isInteger(selectedTrainerId) || selectedTrainerId <= 0)) ||
        !startTime || !endTime) {
      setSubmitError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (startTime >= endTime) {
      setSubmitError('Bitiş saati, başlangıç saatinden sonra olmalıdır.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: any = {
      member_id: selectedMemberId,
      starts_at: `${selectedDate} ${startTime}:00`,
      ends_at: `${selectedDate} ${endTime}:00`
    };

    if (scope !== 'trainer') {
      payload.trainer_id = selectedTrainerId;
    }

    let endpoint = '';
    if (scope === 'admin') endpoint = '/api/admin/appointments';
    else if (scope === 'reception') endpoint = '/api/reception/appointments';
    else if (scope === 'trainer') endpoint = '/api/trainer/appointments';

    try {
      const res = await apiClient.post(endpoint, payload);
      
      // Strict validation of success response
      if (!res || typeof res !== 'object' || !res.appointment || typeof res.appointment !== 'object') {
        throw new Error('Invalid response structure');
      }
      
      const appt = res.appointment;
      if (typeof appt.id !== 'number' || !Number.isInteger(appt.id) || appt.id <= 0 ||
          typeof appt.uuid !== 'string' || !appt.uuid ||
          typeof appt.member_id !== 'number' || !Number.isInteger(appt.member_id) || appt.member_id <= 0 ||
          typeof appt.starts_at !== 'string' || !appt.starts_at ||
          typeof appt.ends_at !== 'string' || !appt.ends_at ||
          appt.status !== 'scheduled' ||
          typeof appt.trainer_id !== 'number' || !Number.isInteger(appt.trainer_id) || appt.trainer_id <= 0) {
        throw new Error('Malformed appointment in response');
      }

      if (mountedRef.current) onSuccess();
    } catch (err: any) {
      console.error(err);
      if (mountedRef.current) {
        let errMsg = 'Randevu oluşturulurken beklenmedik bir hata oluştu.';
        if (err.code) {
          const codeMap: Record<string, string> = {
            'MEMBER_CONFLICT': 'Üyenin bu saat aralığında başka bir randevusu var.',
            'TRAINER_CONFLICT': 'Eğitmenin bu saat aralığında başka bir randevusu var.',
            'MEMBER_INELIGIBLE': 'Üye bu tarih için randevuya uygun değil.',
            'TRAINER_INELIGIBLE': 'Eğitmen aktif değil.',
            'FORBIDDEN': 'Bu randevuyu oluşturma yetkiniz yok.',
            'NOT_FOUND': 'Seçilen üye veya eğitmen artık bulunamıyor.',
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
      <div role="dialog" aria-modal="true" aria-labelledby="create-modal-title" className="bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 id="create-modal-title" className="text-lg font-medium text-white">Yeni Randevu</h2>
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

          <form id="appointment-create-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Tarih</label>
              <div className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white/50 text-sm">
                {selectedDate}
              </div>
            </div>

            <div>
              <label htmlFor="member-search" className="block text-sm font-medium text-white/70 mb-1.5">Üye Ara</label>
              <input 
                id="member-search"
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setSelectedMemberId('');
                }}
                maxLength={80}
                placeholder="İsim ile ara (min 2 karakter)"
                className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] placeholder:text-white/30"
                disabled={isSubmitting}
              />
              
              {isSearchingMembers && <div className="text-xs text-white/50 mt-1.5">Aranıyor...</div>}
              {memberSearchError && <div className="text-xs text-red-400 mt-1.5">{memberSearchError}</div>}
              
              {memberOptions.length > 0 && (
                <div className="mt-2 bg-black border border-white/10 rounded max-h-40 overflow-y-auto">
                  {memberOptions.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      disabled={isSubmitting}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition disabled:opacity-50 ${selectedMemberId === m.id ? 'bg-[#851C35]/20 text-[#851C35]' : 'text-white'}`}
                    >
                      {m.first_name} {m.last_name}
                    </button>
                  ))}
                </div>
              )}
              {memberOptions.length === 0 && memberSearch.length >= 2 && !isSearchingMembers && !memberSearchError && (
                 <div className="text-xs text-white/50 mt-1.5">Sonuç bulunamadı.</div>
              )}
            </div>

            {scope !== 'trainer' && (
              <div>
                <label htmlFor="trainer-select" className="block text-sm font-medium text-white/70 mb-1.5">Eğitmen</label>
                {trainerError ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-red-400">{trainerError}</div>
                    <button type="button" disabled={isSubmitting} onClick={loadTrainers} className="text-xs text-[#851C35] hover:text-[#6a162a] underline disabled:opacity-50">Tekrar Dene</button>
                  </div>
                ) : isLoadingTrainers ? (
                  <div className="text-sm text-white/50">Yükleniyor...</div>
                ) : (
                  <select 
                    id="trainer-select"
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting || trainers.length === 0}
                    className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] disabled:opacity-50"
                  >
                    <option value="">Seçiniz...</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-white/70 mb-1.5">Başlangıç Saati</label>
                <input 
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-black border border-white/20 rounded px-4 py-2.5 text-white text-sm focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-white/70 mb-1.5">Bitiş Saati</label>
                <input 
                  id="end-time"
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
            form="appointment-create-form"
            disabled={isSubmitting || (scope !== 'trainer' && trainerError !== null)}
            className="px-5 py-2.5 rounded font-medium text-sm bg-[#851C35] text-white hover:bg-[#6a162a] transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Randevu Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
