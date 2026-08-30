export interface ProgressPagination {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

export interface MemberMeasurementListItem {
  id: number;
  uuid: string;
  member_id: number;
  trainer_id: number;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemberMeasurementDetail extends MemberMeasurementListItem {
  notes: string | null;
}

export interface MemberMeasurementListResponse {
  data: {
    items: MemberMeasurementListItem[];
    pagination: ProgressPagination;
  };
}

export interface MemberProgressNoteListItem {
  id: number;
  uuid: string;
  member_id: number;
  trainer_id: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemberProgressNoteDetail extends MemberProgressNoteListItem {
  note: string;
}

export interface MemberProgressNoteListResponse {
  data: {
    items: MemberProgressNoteListItem[];
    pagination: ProgressPagination;
  };
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function isPagination(val: unknown): val is ProgressPagination {
  if (!isRecord(val)) return false;
  return (
    typeof val.total === 'number' && val.total >= 0 &&
    typeof val.page === 'number' && val.page > 0 &&
    typeof val.per_page === 'number' && val.per_page > 0 &&
    typeof val.last_page === 'number' && val.last_page > 0
  );
}

export function isMemberMeasurementListItem(val: unknown): val is MemberMeasurementListItem {
  if (!isRecord(val)) return false;
  return (
    typeof val.id === 'number' && val.id > 0 &&
    typeof val.uuid === 'string' &&
    typeof val.member_id === 'number' && val.member_id > 0 &&
    typeof val.trainer_id === 'number' && val.trainer_id > 0 &&
    typeof val.measured_at === 'string' &&
    (val.weight_kg === null || (typeof val.weight_kg === 'number' && Number.isFinite(val.weight_kg))) &&
    (val.body_fat_percent === null || (typeof val.body_fat_percent === 'number' && Number.isFinite(val.body_fat_percent))) &&
    (val.chest_cm === null || (typeof val.chest_cm === 'number' && Number.isFinite(val.chest_cm))) &&
    (val.waist_cm === null || (typeof val.waist_cm === 'number' && Number.isFinite(val.waist_cm))) &&
    (val.hip_cm === null || (typeof val.hip_cm === 'number' && Number.isFinite(val.hip_cm))) &&
    (val.arm_cm === null || (typeof val.arm_cm === 'number' && Number.isFinite(val.arm_cm))) &&
    (val.thigh_cm === null || (typeof val.thigh_cm === 'number' && Number.isFinite(val.thigh_cm))) &&
    typeof val.created_at === 'string' &&
    typeof val.updated_at === 'string' &&
    (val.deleted_at === null || typeof val.deleted_at === 'string')
  );
}

export function isMemberMeasurementDetail(val: unknown): val is MemberMeasurementDetail {
  if (!isMemberMeasurementListItem(val)) return false;
  const asRecord = val as unknown as Record<string, unknown>;
  return asRecord.notes === null || typeof asRecord.notes === 'string';
}

export function isMemberMeasurementListResponse(val: unknown): val is MemberMeasurementListResponse {
  if (!isRecord(val)) return false;
  const data = val.data;
  if (!isRecord(data)) return false;
  
  if (!Array.isArray(data.items)) return false;
  if (!data.items.every(isMemberMeasurementListItem)) return false;
  
  if (!isPagination(data.pagination)) return false;
  
  return true;
}

export function isMemberProgressNoteListItem(val: unknown): val is MemberProgressNoteListItem {
  if (!isRecord(val)) return false;
  return (
    typeof val.id === 'number' && val.id > 0 &&
    typeof val.uuid === 'string' &&
    typeof val.member_id === 'number' && val.member_id > 0 &&
    typeof val.trainer_id === 'number' && val.trainer_id > 0 &&
    typeof val.recorded_at === 'string' &&
    typeof val.created_at === 'string' &&
    typeof val.updated_at === 'string' &&
    (val.deleted_at === null || typeof val.deleted_at === 'string')
  );
}

export function isMemberProgressNoteDetail(val: unknown): val is MemberProgressNoteDetail {
  if (!isMemberProgressNoteListItem(val)) return false;
  const asRecord = val as unknown as Record<string, unknown>;
  return typeof asRecord.note === 'string';
}

export function isMemberProgressNoteListResponse(val: unknown): val is MemberProgressNoteListResponse {
  if (!isRecord(val)) return false;
  const data = val.data;
  if (!isRecord(data)) return false;

  if (!Array.isArray(data.items)) return false;
  if (!data.items.every(isMemberProgressNoteListItem)) return false;

  if (!isPagination(data.pagination)) return false;

  return true;
}
