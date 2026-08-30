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
  items: MemberMeasurementListItem[];
  pagination: ProgressPagination;
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
  items: MemberProgressNoteListItem[];
  pagination: ProgressPagination;
}


export interface MemberMeasurementCreateResponse {
  id: number;
  uuid: string;
}

export interface MemberProgressSuccessResponse {
  success: true;
}

export interface MemberMeasurementPayload {
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function isPagination(val: unknown): val is ProgressPagination {
  if (!isRecord(val)) return false;
  return (
    typeof val.total === 'number' && Number.isInteger(val.total) && val.total >= 0 &&
    typeof val.page === 'number' && Number.isInteger(val.page) && val.page > 0 &&
    typeof val.per_page === 'number' && Number.isInteger(val.per_page) && val.per_page > 0 && val.per_page <= 100 &&
    typeof val.last_page === 'number' && Number.isInteger(val.last_page) && val.last_page > 0
  );
}

export function isMemberMeasurementListItem(val: unknown): val is MemberMeasurementListItem {
  if (!isRecord(val)) return false;
  return (
    typeof val.id === 'number' && Number.isInteger(val.id) && val.id > 0 &&
    typeof val.uuid === 'string' &&
    typeof val.member_id === 'number' && Number.isInteger(val.member_id) && val.member_id > 0 &&
    typeof val.trainer_id === 'number' && Number.isInteger(val.trainer_id) && val.trainer_id > 0 &&
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
  if (!isRecord(val)) return false; // Already narrowed actually, but for typescript:
  return val.notes === null || typeof val.notes === 'string';
}

export function isMemberMeasurementListResponse(val: unknown): val is MemberMeasurementListResponse {
  if (!isRecord(val)) return false;
  
  if (!Array.isArray(val.items)) return false;
  if (!val.items.every(isMemberMeasurementListItem)) return false;
  
  if (!isPagination(val.pagination)) return false;
  
  return true;
}

export function isMemberProgressNoteListItem(val: unknown): val is MemberProgressNoteListItem {
  if (!isRecord(val)) return false;
  return (
    typeof val.id === 'number' && Number.isInteger(val.id) && val.id > 0 &&
    typeof val.uuid === 'string' &&
    typeof val.member_id === 'number' && Number.isInteger(val.member_id) && val.member_id > 0 &&
    typeof val.trainer_id === 'number' && Number.isInteger(val.trainer_id) && val.trainer_id > 0 &&
    typeof val.recorded_at === 'string' &&
    typeof val.created_at === 'string' &&
    typeof val.updated_at === 'string' &&
    (val.deleted_at === null || typeof val.deleted_at === 'string')
  );
}

export function isMemberProgressNoteDetail(val: unknown): val is MemberProgressNoteDetail {
  if (!isMemberProgressNoteListItem(val)) return false;
  if (!isRecord(val)) return false;
  return typeof val.note === 'string';
}

export function isMemberProgressNoteListResponse(val: unknown): val is MemberProgressNoteListResponse {
  if (!isRecord(val)) return false;

  if (!Array.isArray(val.items)) return false;
  if (!val.items.every(isMemberProgressNoteListItem)) return false;

  if (!isPagination(val.pagination)) return false;

  return true;
}


export function isMemberMeasurementCreateResponse(val: unknown): val is MemberMeasurementCreateResponse {
  if (!isRecord(val)) return false;
  return (
    typeof val.id === 'number' && Number.isInteger(val.id) && val.id > 0 &&
    typeof val.uuid === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.uuid)
  );
}

export function isMemberProgressSuccessResponse(val: unknown): val is MemberProgressSuccessResponse {
  if (!isRecord(val)) return false;
  return val.success === true;
}
