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
