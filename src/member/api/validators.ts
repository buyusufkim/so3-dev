export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let maxDays = daysInMonth[month - 1];

  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap) maxDays = 29;
  }

  return day <= maxDays;
}

export function isValidDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return false;

  const datePart = match[1];
  if (!isValidDate(datePart)) return false;

  const hour = parseInt(match[2], 10);
  const minute = parseInt(match[3], 10);
  const second = parseInt(match[4], 10);

  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  return true;
}

export type MemberAuthIdentity = {
  account: {
    id: number;
    uuid: string;
    username: string;
    status: 'active';
    must_change_password: boolean;
  };
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    status: 'active';
  };
};

export function validateMemberAuthIdentity(data: unknown): MemberAuthIdentity {
  if (!isRecord(data)) throw new Error('Invalid identity');
  if (!isRecord(data.account)) throw new Error('Invalid account');
  if (!isRecord(data.member)) throw new Error('Invalid member');

  const a = data.account;
  const m = data.member;
  
  if (typeof a.id !== 'number' || !Number.isInteger(a.id) || a.id <= 0) throw new Error('Invalid account id');
  if (typeof a.uuid !== 'string' || !a.uuid.trim()) throw new Error('Invalid account uuid');
  if (typeof a.username !== 'string' || !a.username.trim()) throw new Error('Invalid username');
  if (a.status !== 'active') throw new Error('Invalid account status');
  if (typeof a.must_change_password !== 'boolean') throw new Error('Invalid must_change_password');

  if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) throw new Error('Invalid member id');
  if (typeof m.uuid !== 'string' || !m.uuid.trim()) throw new Error('Invalid member uuid');
  if (typeof m.first_name !== 'string' || !m.first_name.trim()) throw new Error('Invalid member first_name');
  if (typeof m.last_name !== 'string' || !m.last_name.trim()) throw new Error('Invalid member last_name');
  if (m.status !== 'active') throw new Error('Invalid member status');

  return {
    account: {
      id: a.id,
      uuid: a.uuid.trim(),
      username: a.username.trim(),
      status: 'active',
      must_change_password: a.must_change_password
    },
    member: {
      id: m.id,
      uuid: m.uuid.trim(),
      first_name: m.first_name.trim(),
      last_name: m.last_name.trim(),
      status: 'active'
    }
  };
}

export type MemberLoginResponse = {
  account: {
    id: number;
    uuid: string;
    username: string;
    must_change_password: boolean;
  };
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
  };
};

export function validateMemberLoginResponse(data: unknown): MemberLoginResponse {
  if (!isRecord(data)) throw new Error('Invalid login response');
  if (!isRecord(data.account)) throw new Error('Invalid account');
  if (!isRecord(data.member)) throw new Error('Invalid member');

  const a = data.account;
  const m = data.member;

  if (typeof a.id !== 'number' || !Number.isInteger(a.id) || a.id <= 0) throw new Error('Invalid account id');
  if (typeof a.uuid !== 'string' || !a.uuid.trim()) throw new Error('Invalid account uuid');
  if (typeof a.username !== 'string' || !a.username.trim()) throw new Error('Invalid username');
  if (typeof a.must_change_password !== 'boolean') throw new Error('Invalid must_change_password');

  if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) throw new Error('Invalid member id');
  if (typeof m.uuid !== 'string' || !m.uuid.trim()) throw new Error('Invalid member uuid');
  if (typeof m.first_name !== 'string' || !m.first_name.trim()) throw new Error('Invalid member first_name');
  if (typeof m.last_name !== 'string' || !m.last_name.trim()) throw new Error('Invalid member last_name');

  return {
    account: {
      id: a.id,
      uuid: a.uuid.trim(),
      username: a.username.trim(),
      must_change_password: a.must_change_password
    },
    member: {
      id: m.id,
      uuid: m.uuid.trim(),
      first_name: m.first_name.trim(),
      last_name: m.last_name.trim()
    }
  };
}

export type MemberOverview = {
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  };
  membership: {
    start_date: string | null;
    end_date: string | null;
    status: 'active' | 'upcoming' | 'expired' | 'not_set';
  };
  trainer: {
    id: number;
    uuid: string;
    name: string;
    role_title: string;
  } | null;
};

export function validateMemberOverview(data: unknown): MemberOverview {
  if (!isRecord(data)) throw new Error('Invalid overview');

  if (!isRecord(data.member)) throw new Error('Invalid member');
  const m = data.member;
  if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) throw new Error('Invalid member id');
  if (typeof m.uuid !== 'string' || !m.uuid.trim()) throw new Error('Invalid member uuid');
  if (typeof m.first_name !== 'string' || !m.first_name.trim()) throw new Error('Invalid member first_name');
  if (typeof m.last_name !== 'string' || !m.last_name.trim()) throw new Error('Invalid member last_name');
  if (typeof m.phone !== 'string' || !m.phone.trim()) throw new Error('Invalid member phone');
  if (m.email !== null && typeof m.email !== 'string') throw new Error('Invalid member email');

  if (!isRecord(data.membership)) throw new Error('Invalid membership');
  const ms = data.membership;
  if (ms.start_date !== null && !isValidDate(ms.start_date)) throw new Error('Invalid membership start_date');
  if (ms.end_date !== null && !isValidDate(ms.end_date)) throw new Error('Invalid membership end_date');
  if (ms.status !== 'active' && ms.status !== 'upcoming' && ms.status !== 'expired' && ms.status !== 'not_set') {
    throw new Error('Invalid membership status');
  }

  let t = null;
  if (data.trainer !== null) {
    if (!isRecord(data.trainer)) throw new Error('Invalid trainer');
    const tr = data.trainer;
    if (typeof tr.id !== 'number' || !Number.isInteger(tr.id) || tr.id <= 0) throw new Error('Invalid trainer id');
    if (typeof tr.uuid !== 'string' || !tr.uuid.trim()) throw new Error('Invalid trainer uuid');
    if (typeof tr.name !== 'string' || !tr.name.trim()) throw new Error('Invalid trainer name');
    if (typeof tr.role_title !== 'string') throw new Error('Invalid trainer role_title');
    t = {
      id: tr.id,
      uuid: tr.uuid.trim(),
      name: tr.name.trim(),
      role_title: tr.role_title
    };
  }

  return {
    member: {
      id: m.id,
      uuid: m.uuid.trim(),
      first_name: m.first_name.trim(),
      last_name: m.last_name.trim(),
      phone: m.phone.trim(),
      email: m.email === null ? null : m.email.trim()
    },
    membership: {
      start_date: ms.start_date,
      end_date: ms.end_date,
      status: ms.status
    },
    trainer: t
  };
}

export type MemberSessionPackage = {
  id: number;
  uuid: string;
  package_name: string;
  total_sessions: number;
  remaining_sessions: number;
  reserved_sessions: number;
  valid_from: string | null;
  valid_until: string | null;
  stored_status: 'active' | 'cancelled';
  effective_status: 'active' | 'expired' | 'exhausted' | 'cancelled';
};

export function validateSessionPackages(data: unknown): MemberSessionPackage[] {
  if (!isRecord(data)) throw new Error('Invalid packages');
  if (!Array.isArray(data.items)) throw new Error('Invalid items array');
  
  return data.items.map(i => {
    if (!isRecord(i)) throw new Error('Invalid package item');
    if (typeof i.id !== 'number' || !Number.isInteger(i.id) || i.id <= 0) throw new Error('Invalid package id');
    if (typeof i.uuid !== 'string' || !i.uuid.trim()) throw new Error('Invalid package uuid');
    if (typeof i.package_name !== 'string' || !i.package_name.trim()) throw new Error('Invalid package_name');
    if (typeof i.total_sessions !== 'number' || !Number.isInteger(i.total_sessions) || i.total_sessions <= 0) throw new Error('Invalid total_sessions');
    if (typeof i.remaining_sessions !== 'number' || !Number.isInteger(i.remaining_sessions)) throw new Error('Invalid remaining_sessions');
    if (typeof i.reserved_sessions !== 'number' || !Number.isInteger(i.reserved_sessions) || i.reserved_sessions < 0) throw new Error('Invalid reserved_sessions');
    
    if (i.valid_from !== null && !isValidDate(i.valid_from)) throw new Error('Invalid valid_from');
    if (i.valid_until !== null && !isValidDate(i.valid_until)) throw new Error('Invalid valid_until');
    
    if (i.stored_status !== 'active' && i.stored_status !== 'cancelled') throw new Error('Invalid stored_status');
    if (i.effective_status !== 'active' && i.effective_status !== 'expired' && i.effective_status !== 'exhausted' && i.effective_status !== 'cancelled') {
      throw new Error('Invalid effective_status');
    }

    return {
      id: i.id,
      uuid: i.uuid.trim(),
      package_name: i.package_name.trim(),
      total_sessions: i.total_sessions,
      remaining_sessions: i.remaining_sessions,
      reserved_sessions: i.reserved_sessions,
      valid_from: i.valid_from,
      valid_until: i.valid_until,
      stored_status: i.stored_status,
      effective_status: i.effective_status
    };
  });
}

export type MemberAppointment = {
  id: number;
  uuid: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  cancellation_reason: string | null;
  trainer: {
    id: number;
    uuid: string;
    name: string;
    role_title: string;
  } | null;
  session_package: {
    id: number;
    package_name: string;
  } | null;
};

export type MemberAppointmentsData = {
  upcoming: MemberAppointment[];
  recent: MemberAppointment[];
};

export function validateAppointments(data: unknown): MemberAppointmentsData {
  if (!isRecord(data)) throw new Error('Invalid appointments');
  
  if (!Array.isArray(data.upcoming)) throw new Error('Invalid upcoming appointments array');
  if (!Array.isArray(data.recent)) throw new Error('Invalid recent appointments array');

  const mapAppt = (i: unknown): MemberAppointment => {
    if (!isRecord(i)) throw new Error('Invalid appointment item');
    if (typeof i.id !== 'number' || !Number.isInteger(i.id) || i.id <= 0) throw new Error('Invalid appointment id');
    if (typeof i.uuid !== 'string' || !i.uuid.trim()) throw new Error('Invalid appointment uuid');
    if (!isValidDateTime(i.starts_at)) throw new Error('Invalid starts_at');
    if (!isValidDateTime(i.ends_at)) throw new Error('Invalid ends_at');
    
    if (i.status !== 'scheduled' && i.status !== 'completed' && i.status !== 'cancelled' && i.status !== 'no_show') {
      throw new Error('Invalid appointment status');
    }
    
    if (i.cancellation_reason !== null && typeof i.cancellation_reason !== 'string') throw new Error('Invalid cancellation_reason');

    let tr = null;
    if (i.trainer !== null) {
      if (!isRecord(i.trainer)) throw new Error('Invalid trainer');
      if (typeof i.trainer.id !== 'number' || !Number.isInteger(i.trainer.id) || i.trainer.id <= 0) throw new Error('Invalid trainer id');
      if (typeof i.trainer.uuid !== 'string' || !i.trainer.uuid.trim()) throw new Error('Invalid trainer uuid');
      if (typeof i.trainer.name !== 'string' || !i.trainer.name.trim()) throw new Error('Invalid trainer name');
      if (typeof i.trainer.role_title !== 'string') throw new Error('Invalid trainer role_title');
      tr = {
        id: i.trainer.id,
        uuid: i.trainer.uuid.trim(),
        name: i.trainer.name.trim(),
        role_title: i.trainer.role_title
      };
    }

    let sp = null;
    if (i.session_package !== null) {
      if (!isRecord(i.session_package)) throw new Error('Invalid session_package');
      if (typeof i.session_package.id !== 'number' || !Number.isInteger(i.session_package.id) || i.session_package.id <= 0) throw new Error('Invalid session_package id');
      if (typeof i.session_package.package_name !== 'string' || !i.session_package.package_name.trim()) throw new Error('Invalid session_package name');
      sp = {
        id: i.session_package.id,
        package_name: i.session_package.package_name.trim()
      };
    }

    return {
      id: i.id,
      uuid: i.uuid.trim(),
      starts_at: i.starts_at,
      ends_at: i.ends_at,
      status: i.status,
      cancellation_reason: i.cancellation_reason === null ? null : i.cancellation_reason.trim(),
      trainer: tr,
      session_package: sp
    };
  };

  return {
    upcoming: data.upcoming.map(mapAppt),
    recent: data.recent.map(mapAppt)
  };
}

export type MemberExercise = {
  id: number;
  exercise_name: string;
  sets: number | null;
  repetitions: string | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  instructions: string | null;
  sort_order: number;
};

export type MemberTrainingProgram = {
  id: number;
  uuid: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  trainer: {
    id: number;
    uuid: string;
    name: string;
    role_title: string;
  } | null;
  exercises: MemberExercise[];
};

export function validateTrainingPrograms(data: unknown): MemberTrainingProgram[] {
  if (!isRecord(data)) throw new Error('Invalid training programs');
  if (!Array.isArray(data.items)) throw new Error('Invalid items array');

  return data.items.map(i => {
    if (!isRecord(i)) throw new Error('Invalid program item');
    if (typeof i.id !== 'number' || !Number.isInteger(i.id) || i.id <= 0) throw new Error('Invalid program id');
    if (typeof i.uuid !== 'string' || !i.uuid.trim()) throw new Error('Invalid program uuid');
    if (typeof i.title !== 'string' || !i.title.trim()) throw new Error('Invalid title');
    
    if (i.start_date !== null && !isValidDate(i.start_date)) throw new Error('Invalid start_date');
    if (i.end_date !== null && !isValidDate(i.end_date)) throw new Error('Invalid end_date');

    let tr = null;
    if (i.trainer !== null) {
      if (!isRecord(i.trainer)) throw new Error('Invalid trainer');
      if (typeof i.trainer.id !== 'number' || !Number.isInteger(i.trainer.id) || i.trainer.id <= 0) throw new Error('Invalid trainer id');
      if (typeof i.trainer.uuid !== 'string' || !i.trainer.uuid.trim()) throw new Error('Invalid trainer uuid');
      if (typeof i.trainer.name !== 'string' || !i.trainer.name.trim()) throw new Error('Invalid trainer name');
      if (typeof i.trainer.role_title !== 'string') throw new Error('Invalid trainer role_title');
      tr = {
        id: i.trainer.id,
        uuid: i.trainer.uuid.trim(),
        name: i.trainer.name.trim(),
        role_title: i.trainer.role_title
      };
    }

    if (!Array.isArray(i.exercises)) throw new Error('Invalid exercises array');

    const exercises = i.exercises.map(ex => {
      if (!isRecord(ex)) throw new Error('Invalid exercise item');
      if (typeof ex.id !== 'number' || !Number.isInteger(ex.id) || ex.id <= 0) throw new Error('Invalid exercise id');
      if (typeof ex.exercise_name !== 'string' || !ex.exercise_name.trim()) throw new Error('Invalid exercise_name');
      
      if (ex.sets !== null && (typeof ex.sets !== 'number' || !Number.isInteger(ex.sets))) throw new Error('Invalid sets');
      if (ex.repetitions !== null && typeof ex.repetitions !== 'string') throw new Error('Invalid repetitions');
      if (ex.duration_seconds !== null && (typeof ex.duration_seconds !== 'number' || !Number.isInteger(ex.duration_seconds))) throw new Error('Invalid duration_seconds');
      if (ex.rest_seconds !== null && (typeof ex.rest_seconds !== 'number' || !Number.isInteger(ex.rest_seconds))) throw new Error('Invalid rest_seconds');
      if (ex.instructions !== null && typeof ex.instructions !== 'string') throw new Error('Invalid instructions');
      if (typeof ex.sort_order !== 'number' || !Number.isInteger(ex.sort_order)) throw new Error('Invalid sort_order');

      return {
        id: ex.id,
        exercise_name: ex.exercise_name.trim(),
        sets: ex.sets,
        repetitions: ex.repetitions,
        duration_seconds: ex.duration_seconds,
        rest_seconds: ex.rest_seconds,
        instructions: ex.instructions === null ? null : ex.instructions.trim(),
        sort_order: ex.sort_order
      };
    });

    return {
      id: i.id,
      uuid: i.uuid.trim(),
      title: i.title.trim(),
      start_date: i.start_date,
      end_date: i.end_date,
      trainer: tr,
      exercises
    };
  });
}


export type MemberMeasurement = {
  id: number;
  uuid: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  trainer: {
    id: number;
    uuid: string;
    name: string;
    role_title: string;
  } | null;
};

export function validateMeasurements(data: unknown): MemberMeasurement[] {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new Error('Invalid measurements response format');
  }

  const items: MemberMeasurement[] = [];
  for (const item of data.items) {
    if (!isRecord(item)) throw new Error('Invalid measurement item');
    
    if (typeof item.id !== 'number' || item.id <= 0 || !Number.isInteger(item.id)) throw new Error('Invalid id');
    if (typeof item.uuid !== 'string' || !item.uuid.trim()) throw new Error('Invalid uuid');
    if (!isValidDateTime(item.measured_at)) throw new Error('Invalid measured_at');
    
    // Validate metrics
    const metrics = ['weight_kg', 'body_fat_percent', 'chest_cm', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm'] as const;
    for (const metric of metrics) {
      const val = item[metric];
      if (val !== null && typeof val !== 'number') throw new Error(`Invalid metric ${metric}`);
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) throw new Error(`Metric ${metric} must be finite`);
        if (metric === 'body_fat_percent' && (val < 0 || val > 100)) throw new Error(`Metric ${metric} out of bounds`);
        if (metric !== 'body_fat_percent' && (val <= 0 || val > 9999.99)) throw new Error(`Metric ${metric} out of bounds`);
      }
    }

    let trainer = null;
    if (item.trainer !== null) {
      if (!isRecord(item.trainer)) throw new Error('Invalid trainer format');
      if (typeof item.trainer.id !== 'number' || item.trainer.id <= 0 || !Number.isInteger(item.trainer.id)) throw new Error('Invalid trainer id');
      if (typeof item.trainer.uuid !== 'string' || !item.trainer.uuid.trim()) throw new Error('Invalid trainer uuid');
      if (typeof item.trainer.name !== 'string' || !item.trainer.name.trim()) throw new Error('Invalid trainer name');
      if (typeof item.trainer.role_title !== 'string') throw new Error('Invalid trainer role_title');
      
      trainer = {
        id: item.trainer.id,
        uuid: item.trainer.uuid,
        name: item.trainer.name,
        role_title: item.trainer.role_title
      };
    }

    items.push({
      id: item.id,
      uuid: item.uuid,
      measured_at: item.measured_at,
      weight_kg: typeof item.weight_kg === 'number' ? item.weight_kg : null,
      body_fat_percent: typeof item.body_fat_percent === 'number' ? item.body_fat_percent : null,
      chest_cm: typeof item.chest_cm === 'number' ? item.chest_cm : null,
      waist_cm: typeof item.waist_cm === 'number' ? item.waist_cm : null,
      hip_cm: typeof item.hip_cm === 'number' ? item.hip_cm : null,
      arm_cm: typeof item.arm_cm === 'number' ? item.arm_cm : null,
      thigh_cm: typeof item.thigh_cm === 'number' ? item.thigh_cm : null,
      trainer
    });
  }
  
  return items;
}

// ==========================================
// F.24C.3 Member Appointment Booking Types & Validators
// ==========================================

export interface MemberBookingPolicy {
  slot_duration_minutes: 60;
  slot_step_minutes: 60;
  minimum_notice_minutes: 120;
  booking_horizon_days: 14;
}

export interface MemberBookingTrainer {
  id: number;
  name: string;
}

export interface MemberBookingSlot {
  starts_at: string;
  ends_at: string;
}

export interface MemberBookingPackage {
  id: number;
  package_name: string;
  remaining_sessions: number;
  valid_until: string | null;
}

export type MemberBookingDayState =
  | 'BOOKABLE'
  | 'MEMBERSHIP_INACTIVE'
  | 'NO_WORKING_HOURS'
  | 'NO_ELIGIBLE_PACKAGE'
  | 'FULLY_BOOKED';

export interface MemberBookingDay {
  date: string;
  state: MemberBookingDayState;
  slots: MemberBookingSlot[];
  eligible_packages: MemberBookingPackage[];
}

export type MemberBookingState =
  | 'READY'
  | 'MEMBERSHIP_NOT_SET'
  | 'TRAINER_NOT_ASSIGNED'
  | 'TRAINER_UNAVAILABLE';

export interface MemberAppointmentBookingOptions {
  timezone: 'Europe/Istanbul';
  booking_state: MemberBookingState;
  policy: MemberBookingPolicy;
  trainer: MemberBookingTrainer | null;
  days: MemberBookingDay[];
}

export interface MemberCreatedAppointment {
  id: number;
  uuid: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled';

  trainer: {
    id: number;
    name: string;
  };

  session_package: {
    id: number;
    package_name: string;
  };
}

function areDatesConsecutive(prevDateStr: string, nextDateStr: string): boolean {
  const [y1, m1, d1] = prevDateStr.split('-').map(Number);
  const [y2, m2, d2] = nextDateStr.split('-').map(Number);
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let maxDays = daysInMonth[m1 - 1];
  if (m1 === 2) {
    const isLeap = (y1 % 4 === 0 && y1 % 100 !== 0) || (y1 % 400 === 0);
    if (isLeap) maxDays = 29;
  }
  let expY = y1;
  let expM = m1;
  let expD = d1 + 1;
  if (expD > maxDays) {
    expD = 1;
    expM = m1 + 1;
    if (expM > 12) {
      expM = 1;
      expY = y1 + 1;
    }
  }
  return y2 === expY && m2 === expM && d2 === expD;
}

function isExact60MinuteSlot(startsAt: string, endsAt: string): boolean {
  if (!isValidDateTime(startsAt) || !isValidDateTime(endsAt)) return false;
  if (!startsAt.endsWith(':00') || !endsAt.endsWith(':00')) return false;
  const [sDate, sTime] = startsAt.split(' ');
  const [eDate, eTime] = endsAt.split(' ');
  if (sDate !== eDate) return false;
  const [sh, sm] = sTime.split(':').map(Number);
  const [eh, em] = eTime.split(':').map(Number);
  const sMin = sh * 60 + sm;
  const eMin = eh * 60 + em;
  return eMin - sMin === 60;
}

function comparePackages(a: MemberBookingPackage, b: MemberBookingPackage): number {
  const aHas = a.valid_until !== null;
  const bHas = b.valid_until !== null;
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  if (aHas && bHas && a.valid_until !== b.valid_until) {
    return a.valid_until! < b.valid_until! ? -1 : 1;
  }
  return a.id - b.id;
}

export function validateAppointmentBookingOptions(data: unknown): MemberAppointmentBookingOptions {
  if (!isRecord(data)) throw new Error('Invalid options data');

  if (data.timezone !== 'Europe/Istanbul') {
    throw new Error('Invalid timezone: expected Europe/Istanbul');
  }

  const validTopStates: MemberBookingState[] = [
    'READY',
    'MEMBERSHIP_NOT_SET',
    'TRAINER_NOT_ASSIGNED',
    'TRAINER_UNAVAILABLE'
  ];
  if (typeof data.booking_state !== 'string' || !validTopStates.includes(data.booking_state as MemberBookingState)) {
    throw new Error(`Invalid booking_state: ${String(data.booking_state)}`);
  }
  const bookingState = data.booking_state as MemberBookingState;

  // Validate policy exact values
  if (!isRecord(data.policy)) throw new Error('Invalid policy object');
  const pol = data.policy;
  if (
    pol.slot_duration_minutes !== 60 ||
    pol.slot_step_minutes !== 60 ||
    pol.minimum_notice_minutes !== 120 ||
    pol.booking_horizon_days !== 14
  ) {
    throw new Error('Invalid booking policy constants');
  }
  const policy: MemberBookingPolicy = {
    slot_duration_minutes: 60,
    slot_step_minutes: 60,
    minimum_notice_minutes: 120,
    booking_horizon_days: 14
  };

  // Validate trainer
  let trainer: MemberBookingTrainer | null = null;
  if (data.trainer !== null) {
    if (!isRecord(data.trainer)) throw new Error('Invalid trainer object');
    if (typeof data.trainer.id !== 'number' || !Number.isInteger(data.trainer.id) || data.trainer.id <= 0) {
      throw new Error('Invalid trainer id');
    }
    if (typeof data.trainer.name !== 'string' || !data.trainer.name.trim()) {
      throw new Error('Invalid trainer name');
    }
    trainer = {
      id: data.trainer.id,
      name: data.trainer.name.trim()
    };
  }

  // Validate days array
  if (!Array.isArray(data.days)) throw new Error('Invalid days: expected array');

  if (bookingState === 'READY') {
    if (trainer === null) {
      throw new Error('Trainer must not be null when booking_state is READY');
    }
    if (data.days.length !== 14) {
      throw new Error(`Expected exactly 14 days when booking_state is READY, got ${data.days.length}`);
    }
  } else {
    if (data.days.length !== 0) {
      throw new Error(`Expected 0 days when booking_state is ${bookingState}, got ${data.days.length}`);
    }
  }

  const validDayStates: MemberBookingDayState[] = [
    'BOOKABLE',
    'MEMBERSHIP_INACTIVE',
    'NO_WORKING_HOURS',
    'NO_ELIGIBLE_PACKAGE',
    'FULLY_BOOKED'
  ];

  const days: MemberBookingDay[] = [];
  let prevDate: string | null = null;

  for (let dIdx = 0; dIdx < data.days.length; dIdx++) {
    const d = data.days[dIdx];
    if (!isRecord(d)) throw new Error(`Day ${dIdx} is not an object`);

    if (!isValidDate(d.date)) throw new Error(`Invalid date format in day ${dIdx}`);
    const dateStr = d.date;

    // Check date ordering and consecutive sequence
    if (prevDate !== null) {
      if (dateStr <= prevDate) {
        throw new Error(`Days must be in strict ascending order: ${prevDate} >= ${dateStr}`);
      }
      if (bookingState === 'READY' && !areDatesConsecutive(prevDate, dateStr)) {
        throw new Error(`Days must be consecutive: ${prevDate} to ${dateStr}`);
      }
    }
    prevDate = dateStr;

    if (typeof d.state !== 'string' || !validDayStates.includes(d.state as MemberBookingDayState)) {
      throw new Error(`Invalid day state ${String(d.state)} on date ${dateStr}`);
    }
    const dayState = d.state as MemberBookingDayState;

    if (!Array.isArray(d.slots)) throw new Error(`slots must be an array on date ${dateStr}`);
    if (!Array.isArray(d.eligible_packages)) throw new Error(`eligible_packages must be an array on date ${dateStr}`);

    if (dayState !== 'BOOKABLE') {
      if (d.slots.length !== 0) {
        throw new Error(`Non-BOOKABLE day ${dateStr} (${dayState}) must have 0 slots, got ${d.slots.length}`);
      }
    } else {
      if (d.slots.length === 0) {
        throw new Error(`BOOKABLE day ${dateStr} must have at least 1 slot`);
      }
      if (d.eligible_packages.length === 0) {
        throw new Error(`BOOKABLE day ${dateStr} must have at least 1 eligible package`);
      }
    }

    // Validate slots
    const slots: MemberBookingSlot[] = [];
    let prevSlotStart: string | null = null;
    const seenSlots = new Set<string>();

    for (let sIdx = 0; sIdx < d.slots.length; sIdx++) {
      const s = d.slots[sIdx];
      if (!isRecord(s)) throw new Error(`Slot ${sIdx} on date ${dateStr} is not an object`);
      if (typeof s.starts_at !== 'string' || typeof s.ends_at !== 'string') {
        throw new Error(`Slot ${sIdx} on date ${dateStr} missing starts_at/ends_at string`);
      }
      if (!isExact60MinuteSlot(s.starts_at, s.ends_at)) {
        throw new Error(`Slot ${sIdx} on date ${dateStr} is not an exact 60-minute same-day slot (${s.starts_at} - ${s.ends_at})`);
      }
      if (!s.starts_at.startsWith(dateStr) || !s.ends_at.startsWith(dateStr)) {
        throw new Error(`Slot ${sIdx} datetime does not match day date ${dateStr}`);
      }

      // Check slot ordering (starts_at ASC, ends_at ASC)
      if (prevSlotStart !== null && s.starts_at <= prevSlotStart) {
        throw new Error(`Slots must be in strict ascending order on date ${dateStr}`);
      }
      prevSlotStart = s.starts_at;

      const slotKey = `${s.starts_at}|${s.ends_at}`;
      if (seenSlots.has(slotKey)) {
        throw new Error(`Duplicate slot ${slotKey} on date ${dateStr}`);
      }
      seenSlots.add(slotKey);

      slots.push({
        starts_at: s.starts_at,
        ends_at: s.ends_at
      });
    }

    // Validate eligible packages
    const packages: MemberBookingPackage[] = [];
    for (let pIdx = 0; pIdx < d.eligible_packages.length; pIdx++) {
      const p = d.eligible_packages[pIdx];
      if (!isRecord(p)) throw new Error(`Package ${pIdx} on date ${dateStr} is not an object`);

      if (typeof p.id !== 'number' || !Number.isInteger(p.id) || p.id <= 0) {
        throw new Error(`Invalid package id on date ${dateStr}`);
      }
      if (typeof p.package_name !== 'string' || !p.package_name.trim()) {
        throw new Error(`Invalid package_name on date ${dateStr}`);
      }
      if (typeof p.remaining_sessions !== 'number' || !Number.isInteger(p.remaining_sessions) || p.remaining_sessions <= 0) {
        throw new Error(`Invalid remaining_sessions on date ${dateStr}: expected positive integer`);
      }
      if (p.valid_until !== null) {
        if (!isValidDate(p.valid_until)) {
          throw new Error(`Invalid valid_until date on date ${dateStr}`);
        }
      }

      const pkg: MemberBookingPackage = {
        id: p.id,
        package_name: p.package_name.trim(),
        remaining_sessions: p.remaining_sessions,
        valid_until: p.valid_until ? p.valid_until.trim() : null
      };

      if (pIdx > 0) {
        const prevPkg = packages[pIdx - 1];
        if (comparePackages(prevPkg, pkg) > 0) {
          throw new Error(`Packages on date ${dateStr} not in canonical server order (valid_until ASC, id ASC)`);
        }
      }

      packages.push(pkg);
    }

    days.push({
      date: dateStr,
      state: dayState,
      slots,
      eligible_packages: packages
    });
  }

  return {
    timezone: 'Europe/Istanbul',
    booking_state: bookingState,
    policy,
    trainer,
    days
  };
}

export function validateCreatedAppointment(data: unknown): MemberCreatedAppointment {
  if (!isRecord(data) || !isRecord(data.appointment)) {
    throw new Error('Invalid created appointment response');
  }

  const a = data.appointment;

  // Strict: raw authority fields must NOT be present
  if (
    'member_id' in a ||
    'trainer_id' in a ||
    'member_session_package_id' in a ||
    'created_by' in a ||
    'created_by_member_account_id' in a ||
    'admin_id' in a ||
    'member' in a
  ) {
    throw new Error('Create response exposes forbidden raw authority fields');
  }

  if (typeof a.id !== 'number' || !Number.isInteger(a.id) || a.id <= 0) {
    throw new Error('Invalid appointment id');
  }
  if (typeof a.uuid !== 'string' || !a.uuid.trim()) {
    throw new Error('Invalid appointment uuid');
  }
  if (!isValidDateTime(a.starts_at) || !a.starts_at.endsWith(':00')) {
    throw new Error('Invalid starts_at format');
  }
  if (!isValidDateTime(a.ends_at) || !a.ends_at.endsWith(':00')) {
    throw new Error('Invalid ends_at format');
  }
  if (!isExact60MinuteSlot(a.starts_at, a.ends_at)) {
    throw new Error('Created appointment is not an exact 60-minute same-day slot');
  }
  if (a.status !== 'scheduled') {
    throw new Error('Created appointment status must be scheduled');
  }

  if (!isRecord(a.trainer)) throw new Error('Invalid trainer snapshot');
  if (typeof a.trainer.id !== 'number' || !Number.isInteger(a.trainer.id) || a.trainer.id <= 0) {
    throw new Error('Invalid trainer snapshot id');
  }
  if (typeof a.trainer.name !== 'string' || !a.trainer.name.trim()) {
    throw new Error('Invalid trainer snapshot name');
  }

  if (!isRecord(a.session_package)) throw new Error('Invalid session_package snapshot');
  if (typeof a.session_package.id !== 'number' || !Number.isInteger(a.session_package.id) || a.session_package.id <= 0) {
    throw new Error('Invalid session_package snapshot id');
  }
  if (typeof a.session_package.package_name !== 'string' || !a.session_package.package_name.trim()) {
    throw new Error('Invalid session_package snapshot package_name');
  }

  return {
    id: a.id,
    uuid: a.uuid.trim(),
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    status: 'scheduled',
    trainer: {
      id: a.trainer.id,
      name: a.trainer.name.trim()
    },
    session_package: {
      id: a.session_package.id,
      package_name: a.session_package.package_name.trim()
    }
  };
}

export type MemberRescheduleSlot = {
  starts_at: string;
  ends_at: string;
};

export type MemberRescheduleDayState =
  | 'BOOKABLE'
  | 'MEMBERSHIP_INACTIVE'
  | 'PACKAGE_INELIGIBLE'
  | 'NO_WORKING_HOURS'
  | 'FULLY_BOOKED';

export type MemberRescheduleDay = {
  date: string;
  state: MemberRescheduleDayState;
  slots: MemberRescheduleSlot[];
};

export type MemberAppointmentRescheduleOptions = {
  timezone: 'Europe/Istanbul';
  appointment: {
    id: number;
    uuid: string;
    starts_at: string;
    ends_at: string;
  };
  trainer: {
    id: number;
    name: string;
  };
  session_package: {
    id: number;
    package_name: string;
  } | null;
  policy: {
    slot_duration_minutes: 60;
    slot_step_minutes: 60;
    minimum_notice_minutes: 120;
    booking_horizon_days: 14;
  };
  days: MemberRescheduleDay[];
};

export function validateAppointmentRescheduleOptions(data: unknown): MemberAppointmentRescheduleOptions {
  if (!isRecord(data)) throw new Error('Invalid reschedule options data');

  if (data.timezone !== 'Europe/Istanbul') {
    throw new Error('Invalid timezone: expected Europe/Istanbul');
  }

  // 1. Target appointment snapshot
  if (!isRecord(data.appointment)) throw new Error('Invalid appointment object');
  const a = data.appointment;
  if (typeof a.id !== 'number' || !Number.isInteger(a.id) || a.id <= 0) {
    throw new Error('Invalid appointment id');
  }
  if (typeof a.uuid !== 'string' || !a.uuid.trim()) {
    throw new Error('Invalid appointment uuid');
  }
  if (!isValidDateTime(a.starts_at) || !a.starts_at.endsWith(':00')) {
    throw new Error('Invalid appointment starts_at');
  }
  if (!isValidDateTime(a.ends_at) || !a.ends_at.endsWith(':00')) {
    throw new Error('Invalid appointment ends_at');
  }
  if (!isExact60MinuteSlot(a.starts_at, a.ends_at)) {
    throw new Error('Appointment is not an exact 60-minute same-day slot');
  }

  const appointmentSnapshot = {
    id: a.id,
    uuid: a.uuid.trim(),
    starts_at: a.starts_at,
    ends_at: a.ends_at
  };

  // 2. Trainer snapshot
  if (!isRecord(data.trainer)) throw new Error('Invalid trainer object');
  if (typeof data.trainer.id !== 'number' || !Number.isInteger(data.trainer.id) || data.trainer.id <= 0) {
    throw new Error('Invalid trainer id');
  }
  if (typeof data.trainer.name !== 'string' || !data.trainer.name.trim()) {
    throw new Error('Invalid trainer name');
  }
  const trainerSnapshot = {
    id: data.trainer.id,
    name: data.trainer.name.trim()
  };

  // 3. Session package snapshot (nullable)
  let packageSnapshot: { id: number; package_name: string } | null = null;
  if (data.session_package !== null) {
    if (!isRecord(data.session_package)) throw new Error('Invalid session_package object');
    if (typeof data.session_package.id !== 'number' || !Number.isInteger(data.session_package.id) || data.session_package.id <= 0) {
      throw new Error('Invalid session_package id');
    }
    if (typeof data.session_package.package_name !== 'string' || !data.session_package.package_name.trim()) {
      throw new Error('Invalid session_package package_name');
    }
    packageSnapshot = {
      id: data.session_package.id,
      package_name: data.session_package.package_name.trim()
    };
  }

  // 4. Policy constants
  if (!isRecord(data.policy)) throw new Error('Invalid policy object');
  const pol = data.policy;
  if (
    pol.slot_duration_minutes !== 60 ||
    pol.slot_step_minutes !== 60 ||
    pol.minimum_notice_minutes !== 120 ||
    pol.booking_horizon_days !== 14
  ) {
    throw new Error('Invalid booking policy constants');
  }
  const policySnapshot = {
    slot_duration_minutes: 60 as const,
    slot_step_minutes: 60 as const,
    minimum_notice_minutes: 120 as const,
    booking_horizon_days: 14 as const
  };

  // 5. Days array
  if (!Array.isArray(data.days)) throw new Error('Invalid days: expected array');
  if (data.days.length !== 14) {
    throw new Error(`Expected exactly 14 days, got ${data.days.length}`);
  }

  const validDayStates: MemberRescheduleDayState[] = [
    'BOOKABLE',
    'MEMBERSHIP_INACTIVE',
    'PACKAGE_INELIGIBLE',
    'NO_WORKING_HOURS',
    'FULLY_BOOKED'
  ];

  const days: MemberRescheduleDay[] = [];
  let prevDate: string | null = null;

  for (let dIdx = 0; dIdx < data.days.length; dIdx++) {
    const d = data.days[dIdx];
    if (!isRecord(d)) throw new Error(`Day ${dIdx} is not an object`);

    if (!isValidDate(d.date)) throw new Error(`Invalid date format in day ${dIdx}`);
    const dateStr = d.date;

    if (prevDate !== null) {
      if (dateStr <= prevDate) {
        throw new Error(`Days must be in strict ascending order: ${prevDate} >= ${dateStr}`);
      }
      if (!areDatesConsecutive(prevDate, dateStr)) {
        throw new Error(`Days must be consecutive: ${prevDate} to ${dateStr}`);
      }
    }
    prevDate = dateStr;

    if (typeof d.state !== 'string' || !validDayStates.includes(d.state as MemberRescheduleDayState)) {
      throw new Error(`Invalid day state ${String(d.state)} on date ${dateStr}`);
    }
    const dayState = d.state as MemberRescheduleDayState;

    if (!Array.isArray(d.slots)) throw new Error(`slots must be an array on date ${dateStr}`);

    if (dayState !== 'BOOKABLE') {
      if (d.slots.length !== 0) {
        throw new Error(`Non-BOOKABLE day ${dateStr} (${dayState}) must have 0 slots, got ${d.slots.length}`);
      }
    } else {
      if (d.slots.length === 0) {
        throw new Error(`BOOKABLE day ${dateStr} must have at least 1 slot`);
      }
    }

    const slots: MemberRescheduleSlot[] = [];
    let prevSlotStart: string | null = null;
    const seenSlots = new Set<string>();

    for (let sIdx = 0; sIdx < d.slots.length; sIdx++) {
      const s = d.slots[sIdx];
      if (!isRecord(s)) throw new Error(`Slot ${sIdx} on date ${dateStr} is not an object`);
      if (typeof s.starts_at !== 'string' || typeof s.ends_at !== 'string') {
        throw new Error(`Slot ${sIdx} on date ${dateStr} missing starts_at/ends_at string`);
      }
      if (!isExact60MinuteSlot(s.starts_at, s.ends_at)) {
        throw new Error(`Slot ${sIdx} on date ${dateStr} is not an exact 60-minute same-day slot (${s.starts_at} - ${s.ends_at})`);
      }
      if (!s.starts_at.startsWith(dateStr) || !s.ends_at.startsWith(dateStr)) {
        throw new Error(`Slot ${sIdx} datetime does not match day date ${dateStr}`);
      }

      // Current appointment slot must NOT be present in options
      if (s.starts_at === appointmentSnapshot.starts_at) {
        throw new Error(`Current appointment slot ${s.starts_at} must not be included in reschedule options`);
      }

      // Check slot ordering (starts_at ASC)
      if (prevSlotStart !== null && s.starts_at <= prevSlotStart) {
        throw new Error(`Slots must be in strict ascending order on date ${dateStr}`);
      }
      prevSlotStart = s.starts_at;

      const slotKey = `${s.starts_at}|${s.ends_at}`;
      if (seenSlots.has(slotKey)) {
        throw new Error(`Duplicate slot ${slotKey} on date ${dateStr}`);
      }
      seenSlots.add(slotKey);

      slots.push({
        starts_at: s.starts_at,
        ends_at: s.ends_at
      });
    }

    days.push({
      date: dateStr,
      state: dayState,
      slots
    });
  }

  return {
    timezone: 'Europe/Istanbul',
    appointment: appointmentSnapshot,
    trainer: trainerSnapshot,
    session_package: packageSnapshot,
    policy: policySnapshot,
    days
  };
}

export type MemberCancelledAppointmentResponse = {
  appointment: {
    id: number;
    uuid: string;
    member_id: number;
    trainer_id: number;
    member_session_package_id: number | null;
    starts_at: string;
    ends_at: string;
    status: 'cancelled';
    cancellation_reason: string;
    cancelled_at: string;
  };
};

export function validateCancelledAppointmentResponse(data: unknown): MemberCancelledAppointmentResponse {
  if (!isRecord(data) || !isRecord(data.appointment)) {
    throw new Error('Invalid cancelled appointment response');
  }
  const a = data.appointment;
  if (typeof a.id !== 'number' || !Number.isInteger(a.id) || a.id <= 0) {
    throw new Error('Invalid appointment id');
  }
  if (typeof a.uuid !== 'string' || !a.uuid.trim()) {
    throw new Error('Invalid appointment uuid');
  }
  if (typeof a.member_id !== 'number' || !Number.isInteger(a.member_id) || a.member_id <= 0) {
    throw new Error('Invalid member_id');
  }
  if (typeof a.trainer_id !== 'number' || !Number.isInteger(a.trainer_id) || a.trainer_id <= 0) {
    throw new Error('Invalid trainer_id');
  }
  if (a.member_session_package_id !== null && (typeof a.member_session_package_id !== 'number' || !Number.isInteger(a.member_session_package_id) || a.member_session_package_id <= 0)) {
    throw new Error('Invalid member_session_package_id');
  }
  if (!isValidDateTime(a.starts_at)) {
    throw new Error('Invalid starts_at');
  }
  if (!isValidDateTime(a.ends_at)) {
    throw new Error('Invalid ends_at');
  }
  if (a.status !== 'cancelled') {
    throw new Error('Expected status to be cancelled');
  }
  if (typeof a.cancellation_reason !== 'string' || !a.cancellation_reason.trim()) {
    throw new Error('Invalid cancellation_reason');
  }
  if (!isValidDateTime(a.cancelled_at)) {
    throw new Error('Invalid cancelled_at');
  }

  return {
    appointment: {
      id: a.id,
      uuid: a.uuid.trim(),
      member_id: a.member_id,
      trainer_id: a.trainer_id,
      member_session_package_id: a.member_session_package_id,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      status: 'cancelled',
      cancellation_reason: a.cancellation_reason.trim(),
      cancelled_at: a.cancelled_at
    }
  };
}

export type MemberRescheduledAppointmentResponse = {
  appointment: {
    id: number;
    uuid: string;
    member_id: number;
    trainer_id: number;
    member_session_package_id: number | null;
    starts_at: string;
    ends_at: string;
    status: 'scheduled';
  };
  reschedule: {
    previous_starts_at: string;
    previous_ends_at: string;
    new_starts_at: string;
    new_ends_at: string;
  };
};

export function validateRescheduledAppointmentResponse(data: unknown): MemberRescheduledAppointmentResponse {
  if (!isRecord(data) || !isRecord(data.appointment) || !isRecord(data.reschedule)) {
    throw new Error('Invalid rescheduled appointment response');
  }
  const a = data.appointment;
  const r = data.reschedule;

  if (typeof a.id !== 'number' || !Number.isInteger(a.id) || a.id <= 0) {
    throw new Error('Invalid appointment id');
  }
  if (typeof a.uuid !== 'string' || !a.uuid.trim()) {
    throw new Error('Invalid appointment uuid');
  }
  if (typeof a.member_id !== 'number' || !Number.isInteger(a.member_id) || a.member_id <= 0) {
    throw new Error('Invalid member_id');
  }
  if (typeof a.trainer_id !== 'number' || !Number.isInteger(a.trainer_id) || a.trainer_id <= 0) {
    throw new Error('Invalid trainer_id');
  }
  if (a.member_session_package_id !== null && (typeof a.member_session_package_id !== 'number' || !Number.isInteger(a.member_session_package_id) || a.member_session_package_id <= 0)) {
    throw new Error('Invalid member_session_package_id');
  }
  if (!isValidDateTime(a.starts_at)) {
    throw new Error('Invalid starts_at');
  }
  if (!isValidDateTime(a.ends_at)) {
    throw new Error('Invalid ends_at');
  }
  if (a.status !== 'scheduled') {
    throw new Error('Expected status to be scheduled');
  }

  if (!isValidDateTime(r.previous_starts_at) || !isValidDateTime(r.previous_ends_at)) {
    throw new Error('Invalid previous datetime in reschedule');
  }
  if (!isValidDateTime(r.new_starts_at) || !isValidDateTime(r.new_ends_at)) {
    throw new Error('Invalid new datetime in reschedule');
  }

  return {
    appointment: {
      id: a.id,
      uuid: a.uuid.trim(),
      member_id: a.member_id,
      trainer_id: a.trainer_id,
      member_session_package_id: a.member_session_package_id,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      status: 'scheduled'
    },
    reschedule: {
      previous_starts_at: r.previous_starts_at,
      previous_ends_at: r.previous_ends_at,
      new_starts_at: r.new_starts_at,
      new_ends_at: r.new_ends_at
    }
  };
}
