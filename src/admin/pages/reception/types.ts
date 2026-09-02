export interface ReceptionVisitItem {
  id: number;
  uuid: string;
  checked_in_at: string;
}

export interface ReceptionOccupancyMember {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
}

export interface ReceptionOccupancyItem {
  visit: ReceptionVisitItem;
  member: ReceptionOccupancyMember;
  is_stale: boolean;
}

export interface ReceptionOccupancyResponse {
  current_count: number;
  stale_count: number;
  items: ReceptionOccupancyItem[];
}

export interface ReceptionMemberSearchItem {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: 'active' | 'inactive';
  membership_start_date: string | null;
  membership_end_date: string | null;
}

export interface ReceptionSearchResponse {
  items: ReceptionMemberSearchItem[];
}

export interface ReceptionCheckInVisit {
  id: number;
  uuid: string;
  member_id: number;
  checked_in_at: string;
}

export interface ReceptionCheckInResponse {
  visit: ReceptionCheckInVisit;
}

export interface ReceptionCheckOutVisit {
  id: number;
  uuid: string;
  member_id: number;
  checked_in_at: string;
  checked_out_at: string;
}

export interface ReceptionCheckOutResponse {
  visit: ReceptionCheckOutVisit;
}

export interface ReceptionRenewalResponse {
  renewal: {
    id: number;
    uuid: string;
    member_id: number;
    previous_start_date: string | null;
    previous_end_date: string | null;
    new_start_date: string;
    new_end_date: string;
    created_at: string;
  };
}

