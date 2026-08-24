export interface TrainingProgramListItem {
  id: number;
  uuid: string;
  title: string;
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  trainer: {
    id: number;
    name: string;
  };
}

export interface TrainingProgramsResponse {
  items: TrainingProgramListItem[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

export interface TrainingProgramDetail {
  id: number;
  uuid: string;
  title: string;
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
  };
  trainer: {
    id: number;
    name: string;
  };
}

export interface TrainingProgramCreateResponse {
  id: number;
  uuid: string;
}

export interface SuccessResponse {
  success: boolean;
}

// --- TYPE GUARDS ---

const isObject = (val: unknown): val is Record<string, unknown> => {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
};

const isPosInt = (val: unknown): val is number => {
  return typeof val === 'number' && Number.isInteger(val) && val > 0;
};

const isNonNegInt = (val: unknown): val is number => {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
};

const isString = (val: unknown): val is string => {
  return typeof val === 'string';
};

const isStringOrNull = (val: unknown): val is string | null => {
  return val === null || typeof val === 'string';
};

export function isTrainingProgramStatus(status: unknown): status is "draft" | "active" | "archived" {
  return status === "draft" || status === "active" || status === "archived";
}

export function isTrainingProgramListItem(item: unknown): item is TrainingProgramListItem {
  if (!isObject(item)) return false;
  if (!isPosInt(item.id)) return false;
  if (!isString(item.uuid)) return false;
  if (!isString(item.title)) return false;
  if (!isTrainingProgramStatus(item.status)) return false;
  if (!isStringOrNull(item.start_date)) return false;
  if (!isStringOrNull(item.end_date)) return false;
  if (!isString(item.created_at)) return false;
  if (!isString(item.updated_at)) return false;
  if (!isStringOrNull(item.deleted_at)) return false;

  const trainer = item.trainer;
  if (!isObject(trainer)) return false;
  if (!isPosInt(trainer.id)) return false;
  if (!isString(trainer.name)) return false;

  return true;
}

export function isTrainingProgramsResponse(res: unknown): res is TrainingProgramsResponse {
  if (!isObject(res)) return false;
  if (!Array.isArray(res.items)) return false;
  if (!res.items.every(isTrainingProgramListItem)) return false;

  const pag = res.pagination;
  if (!isObject(pag)) return false;
  if (!isNonNegInt(pag.total)) return false;
  if (!isPosInt(pag.page)) return false;
  if (!isPosInt(pag.per_page)) return false;
  if (!isPosInt(pag.last_page)) return false;

  return true;
}

export function isTrainingProgramDetail(detail: unknown): detail is TrainingProgramDetail {
  if (!isObject(detail)) return false;
  if (!isPosInt(detail.id)) return false;
  if (!isString(detail.uuid)) return false;
  if (!isString(detail.title)) return false;
  if (!isTrainingProgramStatus(detail.status)) return false;
  if (!isStringOrNull(detail.start_date)) return false;
  if (!isStringOrNull(detail.end_date)) return false;
  if (!isStringOrNull(detail.notes)) return false;
  if (!isString(detail.created_at)) return false;
  if (!isString(detail.updated_at)) return false;

  const member = detail.member;
  if (!isObject(member)) return false;
  if (!isPosInt(member.id)) return false;
  if (!isString(member.uuid)) return false;
  if (!isString(member.first_name)) return false;
  if (!isString(member.last_name)) return false;

  const trainer = detail.trainer;
  if (!isObject(trainer)) return false;
  if (!isPosInt(trainer.id)) return false;
  if (!isString(trainer.name)) return false;

  return true;
}

export function isTrainingProgramCreateResponse(res: unknown): res is TrainingProgramCreateResponse {
  if (!isObject(res)) return false;
  if (!isPosInt(res.id)) return false;
  if (!isString(res.uuid)) return false;
  return true;
}

export function isSuccessResponse(res: unknown): res is SuccessResponse {
  if (!isObject(res)) return false;
  if (typeof res.success !== 'boolean') return false;
  return true;
}

// --- PROGRAM EXERCISES ---
export interface ProgramExercise {
  id: number;
  program_id: number;
  exercise_name: string;
  sets: number | null;
  repetitions: string | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  instructions: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramExerciseCreateResponse {
  id: number;
  program_id: number;
}

export function isProgramExercise(val: unknown): val is ProgramExercise {
  if (!isObject(val)) return false;
  if (!isPosInt(val.id)) return false;
  if (!isPosInt(val.program_id)) return false;
  if (!isString(val.exercise_name)) return false;
  if (val.sets !== null && !isPosInt(val.sets)) return false;
  if (!isStringOrNull(val.repetitions)) return false;
  if (val.duration_seconds !== null && !isPosInt(val.duration_seconds)) return false;
  if (val.rest_seconds !== null && !isNonNegInt(val.rest_seconds)) return false;
  if (!isStringOrNull(val.instructions)) return false;
  if (!isNonNegInt(val.sort_order)) return false;
  if (!isString(val.created_at)) return false;
  if (!isString(val.updated_at)) return false;
  return true;
}

export function isProgramExerciseArray(val: unknown): val is ProgramExercise[] {
  return Array.isArray(val) && val.every(isProgramExercise);
}

export function isProgramExerciseCreateResponse(val: unknown): val is ProgramExerciseCreateResponse {
  if (!isObject(val)) return false;
  if (!isPosInt(val.id)) return false;
  if (!isPosInt(val.program_id)) return false;
  return true;
}
