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
