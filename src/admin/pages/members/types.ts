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
    typeof data.id === 'number' && data.id > 0 &&
    typeof data.uuid === 'string' &&
    (data.session_package_id === null || typeof data.session_package_id === 'number') &&
    typeof data.package_name === 'string' &&
    typeof data.total_sessions === 'number' && data.total_sessions > 0 &&
    typeof data.valid_from === 'string' &&
    (data.valid_until === null || typeof data.valid_until === 'string') &&
    (data.stored_status === 'active' || data.stored_status === 'cancelled') &&
    ['active', 'cancelled', 'expired', 'exhausted'].includes(data.effective_status) &&
    typeof data.remaining_sessions === 'number' &&
    typeof data.reserved_sessions === 'number' && data.reserved_sessions >= 0 &&
    typeof data.created_at === 'string' &&
    (data.cancelled_at === null || typeof data.cancelled_at === 'string') &&
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
  return (
    typeof data === 'object' && data !== null &&
    typeof data.id === 'number' && data.id > 0 &&
    typeof data.uuid === 'string' &&
    (data.appointment_id === null || typeof data.appointment_id === 'number') &&
    ['reserve', 'release', 'adjustment'].includes(data.entry_type) &&
    typeof data.delta === 'number' && data.delta !== 0 &&
    (data.reason === null || typeof data.reason === 'string') &&
    typeof data.created_at === 'string' &&
    typeof data.created_by_name === 'string'
  );
}
