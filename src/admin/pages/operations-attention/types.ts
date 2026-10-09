export interface OperationsAttentionAppointmentsToday {
  scheduled_future: number;
  scheduled_in_progress: number;
  needs_terminalization: number;
}

export interface OperationsAttentionAppointments {
  needs_terminalization_count: number;
  oldest_needs_terminalization_ends_at: string | null;
  today: OperationsAttentionAppointmentsToday;
}

export interface OperationsAttentionOpenVisits {
  current: number;
  carried_over: number;
  opened_today: number;
  future_dated: number;
  oldest_checked_in_at: string | null;
}

export interface OperationsAttentionResponse {
  timezone: 'Europe/Istanbul';
  generated_at: string;
  appointments: OperationsAttentionAppointments;
  open_visits: OperationsAttentionOpenVisits;
}

const DATETIME_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]) (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

function isValidDateTimeString(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  if (!DATETIME_REGEX.test(val)) return false;
  const [datePart, timePart] = val.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second
  );
}

function isExactObject(val: unknown, expectedKeys: string[]): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const keys = Object.keys(val);
  if (keys.length !== expectedKeys.length) return false;
  return expectedKeys.every(k => Object.prototype.hasOwnProperty.call(val, k));
}

function isNonNegativeInteger(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
}

/**
 * Strict fail-closed runtime validator for OperationsAttentionResponse.
 * Enforces exact keys, Europe/Istanbul timezone, canonical datetime format,
 * non-negative integers, and relational invariants:
 * - appointments.today.needs_terminalization <= appointments.needs_terminalization_count
 * - appointments oldest timestamp non-null iff needs_terminalization_count > 0
 * - open_visits.current === carried_over + opened_today + future_dated
 * - open_visits oldest timestamp non-null iff current > 0
 */
export function validateOperationsAttention(data: unknown): data is OperationsAttentionResponse {
  if (!isExactObject(data, ['timezone', 'generated_at', 'appointments', 'open_visits'])) {
    return false;
  }

  // Timezone check
  if (data.timezone !== 'Europe/Istanbul') {
    return false;
  }

  // generated_at check
  if (!isValidDateTimeString(data.generated_at)) {
    return false;
  }

  // appointments check
  const appts = data.appointments;
  if (!isExactObject(appts, ['needs_terminalization_count', 'oldest_needs_terminalization_ends_at', 'today'])) {
    return false;
  }

  if (!isNonNegativeInteger(appts.needs_terminalization_count)) {
    return false;
  }

  if (appts.needs_terminalization_count === 0) {
    if (appts.oldest_needs_terminalization_ends_at !== null) return false;
  } else {
    if (!isValidDateTimeString(appts.oldest_needs_terminalization_ends_at)) return false;
  }

  const today = appts.today;
  if (!isExactObject(today, ['scheduled_future', 'scheduled_in_progress', 'needs_terminalization'])) {
    return false;
  }

  if (
    !isNonNegativeInteger(today.scheduled_future) ||
    !isNonNegativeInteger(today.scheduled_in_progress) ||
    !isNonNegativeInteger(today.needs_terminalization)
  ) {
    return false;
  }

  // Invariant: today's needs_terminalization is a subset of all unresolved backlog
  if (today.needs_terminalization > appts.needs_terminalization_count) {
    return false;
  }

  // open_visits check
  const visits = data.open_visits;
  if (!isExactObject(visits, ['current', 'carried_over', 'opened_today', 'future_dated', 'oldest_checked_in_at'])) {
    return false;
  }

  if (
    !isNonNegativeInteger(visits.current) ||
    !isNonNegativeInteger(visits.carried_over) ||
    !isNonNegativeInteger(visits.opened_today) ||
    !isNonNegativeInteger(visits.future_dated)
  ) {
    return false;
  }

  // Relational invariant: current === carried_over + opened_today + future_dated
  if (visits.current !== visits.carried_over + visits.opened_today + visits.future_dated) {
    return false;
  }

  // Oldest timestamp consistency
  if (visits.current === 0) {
    if (visits.oldest_checked_in_at !== null) return false;
  } else {
    if (!isValidDateTimeString(visits.oldest_checked_in_at)) return false;
  }

  return true;
}
