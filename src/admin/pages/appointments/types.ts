export type AppointmentScope = 'admin' | 'reception' | 'trainer';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: number;
  uuid: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
}

export interface Member {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
}

export interface Trainer {
  id: number;
  uuid: string;
  name: string;
}

export interface AppointmentListItem {
  appointment: Appointment;
  member: Member;
  trainer: Trainer;
}

export interface AppointmentListResponse {
  items: AppointmentListItem[];
}

export interface AppointmentSessionPackageOption {
  id: number;
  package_name: string;
  total_sessions: number;
  remaining_sessions: number;
  reserved_sessions: number;
  valid_from: string;
  valid_until: string | null;
}


function isValidCalendarDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const parts = dateString.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if ([4, 6, 9, 11].includes(m) && d > 30) return false;
  if (m === 2) {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (isLeap && d > 29) return false;
    if (!isLeap && d > 28) return false;
  }
  return true;
}

export function validateAppointmentSessionPackageOption(item: unknown): item is AppointmentSessionPackageOption {
  if (!item || typeof item !== 'object') return false;
  const opt = item as Record<string, unknown>;
  if (typeof opt.id !== 'number' || !Number.isInteger(opt.id) || opt.id <= 0) return false;
  if (typeof opt.package_name !== 'string' || opt.package_name.trim() === '') return false;
  if (typeof opt.total_sessions !== 'number' || !Number.isInteger(opt.total_sessions) || opt.total_sessions <= 0) return false;
  if (typeof opt.remaining_sessions !== 'number' || !Number.isInteger(opt.remaining_sessions) || opt.remaining_sessions <= 0) return false;
  if (typeof opt.reserved_sessions !== 'number' || !Number.isInteger(opt.reserved_sessions) || opt.reserved_sessions < 0) return false;
  
  if (typeof opt.valid_from !== 'string' || !isValidCalendarDate(opt.valid_from)) return false;
  if (opt.valid_until !== null && (typeof opt.valid_until !== 'string' || !isValidCalendarDate(opt.valid_until))) return false;
  
  return true;
}

export function validateAppointmentSessionPackageOptionsResponse(response: unknown): AppointmentSessionPackageOption[] {
  if (!response || typeof response !== 'object' || !('items' in response) || !Array.isArray((response as Record<string, unknown>).items)) {
    throw new Error("Seans paketi verisi doğrulanamadı.");
  }
  const items = (response as Record<string, unknown>).items as unknown[];
  const validItems: AppointmentSessionPackageOption[] = [];
  for (const item of items) {
    if (!validateAppointmentSessionPackageOption(item)) {
      throw new Error("Seans paketi verisi doğrulanamadı.");
    }
    validItems.push({
      id: item.id,
      package_name: item.package_name.trim(),
      total_sessions: item.total_sessions,
      remaining_sessions: item.remaining_sessions,
      reserved_sessions: item.reserved_sessions,
      valid_from: item.valid_from,
      valid_until: item.valid_until
    });
  }
  return validItems;
}

export function validateAppointmentCreateSuccessResponse(response: unknown, expectedMemberId: number, expectedTrainerId: number | null, expectedPackageId: number, expectedStartsAt: string, expectedEndsAt: string): void {
  if (!response || typeof response !== 'object') throw new Error('Geçersiz yanıt formatı.');
  const appt = (response as Record<string, unknown>).appointment as Record<string, unknown>;
  if (!appt || typeof appt !== 'object') throw new Error('Geçersiz yanıt formatı.');
  
  if (typeof appt.id !== 'number' || !Number.isFinite(appt.id) || !Number.isInteger(appt.id) || appt.id <= 0) throw new Error('Geçersiz id');
  if (typeof appt.uuid !== 'string' || appt.uuid.trim() === '') throw new Error('Geçersiz uuid');
  
  if (typeof appt.member_id !== 'number' || appt.member_id !== expectedMemberId) throw new Error('Member mismatch');
  
  if (expectedTrainerId !== null) {
    if (typeof appt.trainer_id !== 'number' || !Number.isFinite(appt.trainer_id) || !Number.isInteger(appt.trainer_id) || appt.trainer_id <= 0 || appt.trainer_id !== expectedTrainerId) throw new Error('Trainer mismatch');
  } else {
    if (typeof appt.trainer_id !== 'number' || !Number.isFinite(appt.trainer_id) || !Number.isInteger(appt.trainer_id) || appt.trainer_id <= 0) throw new Error('Trainer mismatch');
  }
  
  if (typeof appt.member_session_package_id !== 'number' || appt.member_session_package_id !== expectedPackageId) throw new Error('Package mismatch');
  
  if (appt.starts_at !== expectedStartsAt) throw new Error('Start time mismatch');
  if (appt.ends_at !== expectedEndsAt) throw new Error('End time mismatch');
  if (appt.status !== 'scheduled') throw new Error('Invalid status');
}
