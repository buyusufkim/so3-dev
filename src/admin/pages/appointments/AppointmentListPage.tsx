import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../api/client';
import { AppointmentScope, AppointmentListResponse, AppointmentStatus, AppointmentListItem } from './types';
import { AppointmentCreateModal } from './AppointmentCreateModal';
import { AppointmentRescheduleModal } from './AppointmentRescheduleModal';

interface AppointmentListPageProps {
  scope: AppointmentScope;
}

function getIstanbulDateString(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

function addOneDay(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().substring(0, 10);
}

function subOneDay(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().substring(0, 10);
}

function extractTime(datetimeStr: string) {
  const parts = datetimeStr.split(' ');
  if (parts.length > 1) {
    const timeParts = parts[1].split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0]}:${timeParts[1]}`;
    }
  }
  return '';
}

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'Gelmedi'
};

const statusColors: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
  no_show: 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
};

function validateAppointmentResponse(data: unknown): AppointmentListResponse {
  if (!data || typeof data !== 'object' || !Array.isArray((data as any).items)) {
    throw new Error('Invalid response: expected items array');
  }

  const validItems: AppointmentListItem[] = [];

  for (const item of (data as any).items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item data');
    }
    
    const appt = item.appointment;
    const member = item.member;
    const trainer = item.trainer;

    if (!appt || typeof appt !== 'object' || typeof appt.id !== 'number' || !Number.isInteger(appt.id) || appt.id <= 0 ||
        typeof appt.uuid !== 'string' || !appt.uuid ||
        typeof appt.starts_at !== 'string' || !appt.starts_at ||
        typeof appt.ends_at !== 'string' || !appt.ends_at ||
        !['scheduled', 'completed', 'cancelled', 'no_show'].includes(appt.status)) {
      throw new Error('Invalid appointment data');
    }

    if (!member || typeof member !== 'object' || typeof member.id !== 'number' || !Number.isInteger(member.id) || member.id <= 0 ||
        typeof member.uuid !== 'string' || !member.uuid ||
        typeof member.first_name !== 'string' ||
        typeof member.last_name !== 'string') {
      throw new Error('Invalid member data');
    }

    if (!trainer || typeof trainer !== 'object' || typeof trainer.id !== 'number' || !Number.isInteger(trainer.id) || trainer.id <= 0 ||
        typeof trainer.uuid !== 'string' || !trainer.uuid ||
        typeof trainer.name !== 'string') {
      throw new Error('Invalid trainer data');
    }

    validItems.push({
      appointment: {
        id: appt.id,
        uuid: appt.uuid,
        starts_at: appt.starts_at,
        ends_at: appt.ends_at,
        status: appt.status as AppointmentStatus
      },
      member: {
        id: member.id,
        uuid: member.uuid,
        first_name: member.first_name,
        last_name: member.last_name
      },
      trainer: {
        id: trainer.id,
        uuid: trainer.uuid,
        name: trainer.name
      }
    });
  }

  return { items: validItems };
}

export function AppointmentListPage({ scope }: AppointmentListPageProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getIstanbulDateString());
  const [items, setItems] = useState<AppointmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState<AppointmentListItem | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);

  const fetchAppointments = useCallback(async (date: string) => {
    requestGenerationRef.current += 1;
    const localGeneration = requestGenerationRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    const from = `${date} 00:00:00`;
    const to = `${addOneDay(date)} 00:00:00`;

    let endpoint = '';
    if (scope === 'admin') endpoint = '/api/admin/appointments';
    else if (scope === 'reception') endpoint = '/api/reception/appointments';
    else if (scope === 'trainer') endpoint = '/api/trainer/appointments';

    try {
      const response = await apiClient.get(`${endpoint}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        signal: abortController.signal
      });
      
      const validated = validateAppointmentResponse(response);
      if (localGeneration === requestGenerationRef.current && !abortController.signal.aborted) {
        setItems(validated.items);
      }
    } catch (err: any) {
      if (abortController.signal.aborted || localGeneration !== requestGenerationRef.current) return;
      console.error(err);
      setError('Randevular yüklenirken bir hata oluştu.');
    } finally {
      if (localGeneration === requestGenerationRef.current && !abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [scope]);

  useEffect(() => {
    fetchAppointments(selectedDate);
    return () => {
      requestGenerationRef.current += 1;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedDate, fetchAppointments]);

  const handlePrevDay = () => setSelectedDate(prev => subOneDay(prev));
  const handleNextDay = () => setSelectedDate(prev => addOneDay(prev));
  const handleToday = () => setSelectedDate(getIstanbulDateString());

  let pageTitle = 'Randevular';
  if (scope === 'reception') pageTitle = 'Resepsiyon Randevuları';
  if (scope === 'trainer') pageTitle = 'Randevularım';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-xl font-medium">{pageTitle}</h2>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-[#851C35] text-white text-sm font-medium rounded hover:bg-[#6a162a] transition flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Yeni Randevu
        </button>
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={handlePrevDay}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition text-sm"
          >
            Önceki Gün
          </button>
          
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
              }
            }}
            className="px-4 py-2 bg-black border border-white/20 rounded focus:border-[#851C35] focus:outline-none focus:ring-1 focus:ring-[#851C35] text-white text-sm"
          />
          
          <button 
            onClick={handleToday}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition text-sm"
          >
            Bugün
          </button>
          
          <button 
            onClick={handleNextDay}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition text-sm"
          >
            Sonraki Gün
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 bg-[#121212] border border-white/10 rounded-lg text-white/50">
          Yükleniyor...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 bg-[#121212] border border-white/10 rounded-lg gap-4">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={() => fetchAppointments(selectedDate)}
            className="px-4 py-2 bg-[#851C35] hover:bg-[#6a162a] transition rounded text-sm text-white"
          >
            Tekrar Dene
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-[#121212] border border-white/10 rounded-lg text-white/50">
          Bu tarih için randevu bulunmuyor.
        </div>
      ) : (
        <div className="bg-[#121212] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/50">
                <th className="p-4 font-medium">Saat</th>
                <th className="p-4 font-medium">Üye</th>
                <th className="p-4 font-medium">Eğitmen</th>
                <th className="p-4 font-medium">Durum</th>
                <th className="p-4 font-medium text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr key={item.appointment.id} className="hover:bg-white/[0.02] transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{extractTime(item.appointment.starts_at)}</span>
                      <span className="text-white/40">-</span>
                      <span className="text-white/60">{extractTime(item.appointment.ends_at)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white/90">
                      {item.member.first_name} {item.member.last_name}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-white/70">
                      {item.trainer.name}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded text-[11px] uppercase tracking-wider font-medium ${statusColors[item.appointment.status]}`}>
                      {statusLabels[item.appointment.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {item.appointment.status === 'scheduled' && (
                      <button
                        onClick={() => {
                          if (!isCreateModalOpen) setRescheduleItem(item);
                        }}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition"
                      >
                        Yeniden Planla
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isCreateModalOpen && !rescheduleItem && (
        <AppointmentCreateModal
          scope={scope}
          selectedDate={selectedDate}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchAppointments(selectedDate);
          }}
        />
      )}

      {rescheduleItem && !isCreateModalOpen && (
        <AppointmentRescheduleModal
          scope={scope}
          item={rescheduleItem}
          onClose={() => setRescheduleItem(null)}
          onSuccess={() => {
            setRescheduleItem(null);
            fetchAppointments(selectedDate);
          }}
        />
      )}
    </div>
  );
}
