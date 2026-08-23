export interface TrainerMemberListItem {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  status: 'active' | 'inactive';
  membership_start_date: string | null;
  membership_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainerMemberDetail extends TrainerMemberListItem {
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
}

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export interface TrainerMembersResponse {
  items: TrainerMemberListItem[];
  pagination: Pagination;
}

export function isTrainerMemberListItem(value: unknown): value is TrainerMemberListItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    typeof item.uuid === 'string' &&
    typeof item.first_name === 'string' &&
    typeof item.last_name === 'string' &&
    typeof item.phone === 'string' &&
    (item.email === null || typeof item.email === 'string') &&
    (item.status === 'active' || item.status === 'inactive') &&
    (item.membership_start_date === null || typeof item.membership_start_date === 'string') &&
    (item.membership_end_date === null || typeof item.membership_end_date === 'string') &&
    typeof item.created_at === 'string' &&
    typeof item.updated_at === 'string'
  );
}

export function isTrainerMemberDetail(value: unknown): value is TrainerMemberDetail {
  if (!isTrainerMemberListItem(value)) return false;
  const item = value as unknown as Record<string, unknown>;
  return (
    (item.emergency_contact_name === null || typeof item.emergency_contact_name === 'string') &&
    (item.emergency_contact_phone === null || typeof item.emergency_contact_phone === 'string') &&
    (item.notes === null || typeof item.notes === 'string')
  );
}

export function isTrainerMembersResponse(value: unknown): value is TrainerMembersResponse {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  
  if (!Array.isArray(data.items)) return false;
  if (!data.items.every(isTrainerMemberListItem)) return false;
  
  const p = data.pagination as Record<string, unknown>;
  if (!p || typeof p !== 'object') return false;
  if (
    typeof p.total !== 'number' ||
    typeof p.page !== 'number' ||
    typeof p.per_page !== 'number' ||
    typeof p.last_page !== 'number'
  ) return false;
  
  return true;
}
