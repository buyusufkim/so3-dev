export interface Member {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  status: 'active' | 'inactive';
  membership_start_date: string | null;
  membership_end_date: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  notes?: string | null;
  consent_given_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  trainer: {
    id: number;
    name: string;
  } | null;
}

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export interface MembersResponse {
  items: Member[];
  pagination: Pagination;
}

export interface MemberVisit {
  id: number;
  uuid: string;
  checked_in_at: string;
  checked_out_at: string | null;
  checked_in_by_name: string | null;
  checked_out_by_name: string | null;
}

export interface MembershipRenewal {
  id: number;
  uuid: string;
  previous_start_date: string | null;
  previous_end_date: string | null;
  new_start_date: string;
  new_end_date: string;
  created_at: string;
  renewed_by_name: string | null;
}

export interface MemberSessionPackage {
  id: number;
  uuid: string;
  session_package_id: number | null;
  package_name: string;
  total_sessions: number;
  valid_from: string;
  valid_until: string | null;
  stored_status: 'active' | 'cancelled';
  effective_status: 'active' | 'cancelled' | 'expired' | 'exhausted';
  remaining_sessions: number;
  reserved_sessions: number;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export function validateMemberSessionPackage(data: any): data is MemberSessionPackage {
  return (
    typeof data === 'object' && data !== null &&
    typeof data.id === 'number' && Number.isFinite(data.id) && Number.isInteger(data.id) && data.id > 0 &&
    typeof data.uuid === 'string' && data.uuid.trim() !== '' &&
    (data.session_package_id === null || (typeof data.session_package_id === 'number' && Number.isFinite(data.session_package_id) && Number.isInteger(data.session_package_id) && data.session_package_id > 0)) &&
    typeof data.package_name === 'string' &&
    typeof data.total_sessions === 'number' && Number.isFinite(data.total_sessions) && Number.isInteger(data.total_sessions) && data.total_sessions > 0 &&
    isValidCanonicalDate(data.valid_from) &&
    (data.valid_until === null || isValidCanonicalDate(data.valid_until)) &&
    (data.stored_status === 'active' || data.stored_status === 'cancelled') &&
    (data.effective_status === 'active' || data.effective_status === 'cancelled' || data.effective_status === 'expired' || data.effective_status === 'exhausted') &&
    typeof data.remaining_sessions === 'number' && Number.isFinite(data.remaining_sessions) && Number.isInteger(data.remaining_sessions) &&
    typeof data.reserved_sessions === 'number' && Number.isFinite(data.reserved_sessions) && Number.isInteger(data.reserved_sessions) && data.reserved_sessions >= 0 &&
    isValidCanonicalDateTime(data.created_at) &&
    (data.cancelled_at === null || isValidCanonicalDateTime(data.cancelled_at)) &&
    (data.cancellation_reason === null || typeof data.cancellation_reason === 'string')
  );
}

export interface MemberLedgerEntry {
  id: number;
  uuid: string;
  appointment_id: number | null;
  entry_type: 'reserve' | 'release' | 'adjustment';
  delta: number;
  reason: string | null;
  created_at: string;
  created_by_name: string;
}

export function validateMemberLedgerEntry(data: any): data is MemberLedgerEntry {
  if (
    typeof data !== 'object' || data === null ||
    typeof data.id !== 'number' || !Number.isFinite(data.id) || !Number.isInteger(data.id) || data.id <= 0 ||
    typeof data.uuid !== 'string' || data.uuid.trim() === '' ||
    !(data.appointment_id === null || (typeof data.appointment_id === 'number' && Number.isFinite(data.appointment_id) && Number.isInteger(data.appointment_id) && data.appointment_id > 0)) ||
    !(data.entry_type === 'reserve' || data.entry_type === 'release' || data.entry_type === 'adjustment') ||
    typeof data.delta !== 'number' || !Number.isFinite(data.delta) || !Number.isInteger(data.delta) || data.delta === 0 ||
    !(data.reason === null || typeof data.reason === 'string') ||
    !isValidCanonicalDateTime(data.created_at) ||
    typeof data.created_by_name !== 'string'
  ) {
    return false;
  }
  
  if (data.entry_type === 'reserve' && (data.delta !== -1 || data.appointment_id === null)) return false;
  if (data.entry_type === 'release' && (data.delta !== 1 || data.appointment_id === null)) return false;
  if (data.entry_type === 'adjustment' && data.appointment_id !== null) return false;
  
  return true;
}

export function isValidCanonicalDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d <= daysInMonth;
}

export function isValidCanonicalDateTime(dateTimeStr: string | null | undefined): boolean {
  if (!dateTimeStr) return false;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) return false;
  const [datePart, timePart] = dateTimeStr.split(' ');
  if (!isValidCanonicalDate(datePart)) return false;
  const [hr, min, sec] = timePart.split(':').map(Number);
  return hr >= 0 && hr < 24 && min >= 0 && min < 60 && sec >= 0 && sec < 60;
}
