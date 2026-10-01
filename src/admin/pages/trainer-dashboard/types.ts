export interface AttentionMemberWithoutActiveProgram {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  updated_at: string;
}

export interface AttentionDraftProgram {
  id: number;
  uuid: string;
  member_id: number;
  member_first_name: string;
  member_last_name: string;
  title: string;
  updated_at: string;
}

export interface AttentionExpiredActiveMembership {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  membership_end_date: string;
}

export interface AttentionExpiredActiveProgram {
  id: number;
  uuid: string;
  member_id: number;
  member_first_name: string;
  member_last_name: string;
  title: string;
  end_date: string;
}

export interface TrainerDashboardData {
  trainer: {
    id: number;
    display_name: string;
  };
  members: {
    total: number;
    active: number;
    inactive: number;
  };
  training_programs: {
    total: number;
    draft: number;
    active: number;
    archived: number;
  };
  recent_members: Array<{
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    status: 'active' | 'inactive';
    updated_at: string;
  }>;
  attention: {
    members_without_active_program: AttentionMemberWithoutActiveProgram[];
    draft_programs: AttentionDraftProgram[];
    expired_active_memberships: AttentionExpiredActiveMembership[];
    expired_active_programs: AttentionExpiredActiveProgram[];
  };
}

export function isTrainerDashboardData(data: unknown): data is TrainerDashboardData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  // Validate trainer
  if (!d.trainer || typeof d.trainer !== 'object') return false;
  const trainer = d.trainer as Record<string, unknown>;
  if (typeof trainer.id !== 'number' || !Number.isInteger(trainer.id) || trainer.id <= 0) return false;
  if (typeof trainer.display_name !== 'string') return false;

  // Validate members
  if (!d.members || typeof d.members !== 'object') return false;
  const members = d.members as Record<string, unknown>;
  if (typeof members.total !== 'number' || !Number.isInteger(members.total) || members.total < 0) return false;
  if (typeof members.active !== 'number' || !Number.isInteger(members.active) || members.active < 0) return false;
  if (typeof members.inactive !== 'number' || !Number.isInteger(members.inactive) || members.inactive < 0) return false;

  // Validate training_programs
  if (!d.training_programs || typeof d.training_programs !== 'object') return false;
  const tp = d.training_programs as Record<string, unknown>;
  if (typeof tp.total !== 'number' || !Number.isInteger(tp.total) || tp.total < 0) return false;
  if (typeof tp.draft !== 'number' || !Number.isInteger(tp.draft) || tp.draft < 0) return false;
  if (typeof tp.active !== 'number' || !Number.isInteger(tp.active) || tp.active < 0) return false;
  if (typeof tp.archived !== 'number' || !Number.isInteger(tp.archived) || tp.archived < 0) return false;

  // Validate recent_members
  if (!Array.isArray(d.recent_members)) return false;
  for (const item of d.recent_members) {
    if (!item || typeof item !== 'object') return false;
    const m = item as Record<string, unknown>;
    if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) return false;
    if (typeof m.uuid !== 'string') return false;
    if (typeof m.first_name !== 'string') return false;
    if (typeof m.last_name !== 'string') return false;
    if (m.status !== 'active' && m.status !== 'inactive') return false;
    if (typeof m.updated_at !== 'string') return false;
  }

  // Validate attention
  if (!d.attention || typeof d.attention !== 'object') return false;
  const att = d.attention as Record<string, unknown>;

  // 1. members_without_active_program
  if (!Array.isArray(att.members_without_active_program)) return false;
  for (const item of att.members_without_active_program) {
    if (!item || typeof item !== 'object') return false;
    const m = item as Record<string, unknown>;
    if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) return false;
    if (typeof m.uuid !== 'string') return false;
    if (typeof m.first_name !== 'string') return false;
    if (typeof m.last_name !== 'string') return false;
    if (typeof m.updated_at !== 'string') return false;
  }

  // 2. draft_programs
  if (!Array.isArray(att.draft_programs)) return false;
  for (const item of att.draft_programs) {
    if (!item || typeof item !== 'object') return false;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== 'number' || !Number.isInteger(p.id) || p.id <= 0) return false;
    if (typeof p.uuid !== 'string') return false;
    if (typeof p.member_id !== 'number' || !Number.isInteger(p.member_id) || p.member_id <= 0) return false;
    if (typeof p.member_first_name !== 'string') return false;
    if (typeof p.member_last_name !== 'string') return false;
    if (typeof p.title !== 'string') return false;
    if (typeof p.updated_at !== 'string') return false;
  }

  // 3. expired_active_memberships
  if (!Array.isArray(att.expired_active_memberships)) return false;
  for (const item of att.expired_active_memberships) {
    if (!item || typeof item !== 'object') return false;
    const m = item as Record<string, unknown>;
    if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) return false;
    if (typeof m.uuid !== 'string') return false;
    if (typeof m.first_name !== 'string') return false;
    if (typeof m.last_name !== 'string') return false;
    if (typeof m.membership_end_date !== 'string') return false;
  }

  // 4. expired_active_programs
  if (!Array.isArray(att.expired_active_programs)) return false;
  for (const item of att.expired_active_programs) {
    if (!item || typeof item !== 'object') return false;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== 'number' || !Number.isInteger(p.id) || p.id <= 0) return false;
    if (typeof p.uuid !== 'string') return false;
    if (typeof p.member_id !== 'number' || !Number.isInteger(p.member_id) || p.member_id <= 0) return false;
    if (typeof p.member_first_name !== 'string') return false;
    if (typeof p.member_last_name !== 'string') return false;
    if (typeof p.title !== 'string') return false;
    if (typeof p.end_date !== 'string') return false;
  }

  return true;
}

export type TrainerDailyAgendaTemporalState = 'upcoming' | 'in_progress' | 'past_due' | 'terminal';

export interface TrainerDailyAgendaMember {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
}

export interface TrainerDailyAgendaSessionPackage {
  id: number;
  package_name: string;
}

export interface TrainerDailyAgendaAppointment {
  id: number;
  uuid: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled';
  member: TrainerDailyAgendaMember;
  session_package: TrainerDailyAgendaSessionPackage | null;
  temporal_state: TrainerDailyAgendaTemporalState;
}

export interface TrainerDailyAgendaSummary {
  total: number;
  scheduled: number;
  completed: number;
  no_show: number;
  cancelled: number;
  remaining_scheduled: number;
  past_due_scheduled: number;
}

export interface TrainerDailyAgendaFocus {
  current: TrainerDailyAgendaAppointment | null;
  next: TrainerDailyAgendaAppointment | null;
}

export interface TrainerDailyAgenda {
  timezone: 'Europe/Istanbul';
  business_date: string;
  generated_at: string;
  trainer: {
    id: number;
    name: string;
  };
  summary: TrainerDailyAgendaSummary;
  focus: TrainerDailyAgendaFocus;
  needs_terminalization: TrainerDailyAgendaAppointment[];
  appointments: TrainerDailyAgendaAppointment[];
}

function isValidDateTime(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str);
}

function isValidDate(str: unknown): str is string {
  if (typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

export function validateTrainerDailyAgenda(data: unknown): TrainerDailyAgenda {
  if (!data || typeof data !== 'object') {
    throw new Error('TrainerDailyAgenda: data must be an object');
  }
  const d = data as Record<string, unknown>;

  if (d.timezone !== 'Europe/Istanbul') {
    throw new Error('TrainerDailyAgenda: timezone must be Europe/Istanbul');
  }

  if (!isValidDate(d.business_date)) {
    throw new Error('TrainerDailyAgenda: invalid business_date');
  }
  const businessDate = d.business_date;

  if (!isValidDateTime(d.generated_at)) {
    throw new Error('TrainerDailyAgenda: invalid generated_at');
  }

  // Trainer
  if (!d.trainer || typeof d.trainer !== 'object') {
    throw new Error('TrainerDailyAgenda: trainer must be an object');
  }
  const tr = d.trainer as Record<string, unknown>;
  if (typeof tr.id !== 'number' || !Number.isInteger(tr.id) || tr.id <= 0) {
    throw new Error('TrainerDailyAgenda: trainer.id must be a positive integer');
  }
  if (typeof tr.name !== 'string' || tr.name.trim() === '') {
    throw new Error('TrainerDailyAgenda: trainer.name must be non-empty string');
  }

  // Summary
  if (!d.summary || typeof d.summary !== 'object') {
    throw new Error('TrainerDailyAgenda: summary must be an object');
  }
  const s = d.summary as Record<string, unknown>;
  const summaryKeys = [
    'total',
    'scheduled',
    'completed',
    'no_show',
    'cancelled',
    'remaining_scheduled',
    'past_due_scheduled'
  ] as const;
  for (const k of summaryKeys) {
    if (typeof s[k] !== 'number' || !Number.isInteger(s[k]) || (s[k] as number) < 0) {
      throw new Error(`TrainerDailyAgenda: summary.${k} must be a non-negative integer`);
    }
  }

  // Appointments
  if (!Array.isArray(d.appointments)) {
    throw new Error('TrainerDailyAgenda: appointments must be an array');
  }

  const knownStatuses = ['scheduled', 'completed', 'no_show', 'cancelled'] as const;
  const knownTemporalStates = ['upcoming', 'in_progress', 'past_due', 'terminal'] as const;

  const validatedAppointments: TrainerDailyAgendaAppointment[] = [];
  const appointmentIdMap = new Map<number, TrainerDailyAgendaAppointment>();

  let computedScheduled = 0;
  let computedCompleted = 0;
  let computedNoShow = 0;
  let computedCancelled = 0;
  let computedPastDue = 0;
  let computedRemaining = 0;

  for (let i = 0; i < d.appointments.length; i++) {
    const raw = d.appointments[i];
    if (!raw || typeof raw !== 'object') {
      throw new Error(`TrainerDailyAgenda: appointment at index ${i} must be an object`);
    }
    const app = raw as Record<string, unknown>;

    if (typeof app.id !== 'number' || !Number.isInteger(app.id) || app.id <= 0) {
      throw new Error(`TrainerDailyAgenda: appointment id must be positive integer`);
    }
    if (typeof app.uuid !== 'string' || app.uuid.trim() === '') {
      throw new Error(`TrainerDailyAgenda: appointment uuid must be non-empty`);
    }
    if (!isValidDateTime(app.starts_at) || !isValidDateTime(app.ends_at)) {
      throw new Error(`TrainerDailyAgenda: appointment starts_at and ends_at must be valid datetimes`);
    }
    if (app.starts_at >= app.ends_at) {
      throw new Error(`TrainerDailyAgenda: appointment starts_at must be strictly before ends_at`);
    }
    if (app.starts_at.substring(0, 10) !== businessDate) {
      throw new Error(`TrainerDailyAgenda: appointment starts_at date must match business_date`);
    }

    if (!knownStatuses.includes(app.status as any)) {
      throw new Error(`TrainerDailyAgenda: unknown status ${app.status}`);
    }
    const status = app.status as TrainerDailyAgendaAppointment['status'];

    if (!knownTemporalStates.includes(app.temporal_state as any)) {
      throw new Error(`TrainerDailyAgenda: unknown temporal_state ${app.temporal_state}`);
    }
    const temporalState = app.temporal_state as TrainerDailyAgendaTemporalState;

    if (status === 'scheduled' && temporalState === 'terminal') {
      throw new Error(`TrainerDailyAgenda: scheduled appointment cannot have terminal temporal_state`);
    }
    if (status !== 'scheduled' && temporalState !== 'terminal') {
      throw new Error(`TrainerDailyAgenda: non-scheduled appointment must have terminal temporal_state`);
    }

    // Member
    if (!app.member || typeof app.member !== 'object') {
      throw new Error(`TrainerDailyAgenda: appointment member must be an object`);
    }
    const m = app.member as Record<string, unknown>;
    if (typeof m.id !== 'number' || !Number.isInteger(m.id) || m.id <= 0) {
      throw new Error(`TrainerDailyAgenda: member.id must be positive integer`);
    }
    if (typeof m.uuid !== 'string' || m.uuid.trim() === '') {
      throw new Error(`TrainerDailyAgenda: member.uuid must be non-empty`);
    }
    if (typeof m.first_name !== 'string' || m.first_name.trim() === '') {
      throw new Error(`TrainerDailyAgenda: member.first_name must be non-empty`);
    }
    if (typeof m.last_name !== 'string' || m.last_name.trim() === '') {
      throw new Error(`TrainerDailyAgenda: member.last_name must be non-empty`);
    }

    // Session package
    let sessionPackage: TrainerDailyAgendaSessionPackage | null = null;
    if (app.session_package !== null) {
      if (!app.session_package || typeof app.session_package !== 'object') {
        throw new Error(`TrainerDailyAgenda: session_package must be object or null`);
      }
      const sp = app.session_package as Record<string, unknown>;
      if (typeof sp.id !== 'number' || !Number.isInteger(sp.id) || sp.id <= 0) {
        throw new Error(`TrainerDailyAgenda: session_package.id must be positive integer`);
      }
      if (typeof sp.package_name !== 'string' || sp.package_name.trim() === '') {
        throw new Error(`TrainerDailyAgenda: session_package.package_name must be non-empty`);
      }
      sessionPackage = {
        id: sp.id,
        package_name: sp.package_name
      };
    }

    const validatedApp: TrainerDailyAgendaAppointment = {
      id: app.id,
      uuid: app.uuid,
      starts_at: app.starts_at,
      ends_at: app.ends_at,
      status,
      member: {
        id: m.id,
        uuid: m.uuid,
        first_name: m.first_name,
        last_name: m.last_name
      },
      session_package: sessionPackage,
      temporal_state: temporalState
    };

    // Sort order check (starts_at ASC, id ASC)
    if (i > 0) {
      const prev = validatedAppointments[i - 1];
      if (prev.starts_at > validatedApp.starts_at || (prev.starts_at === validatedApp.starts_at && prev.id >= validatedApp.id)) {
        throw new Error(`TrainerDailyAgenda: appointments must be strictly sorted by starts_at ASC, id ASC`);
      }
    }

    validatedAppointments.push(validatedApp);
    appointmentIdMap.set(validatedApp.id, validatedApp);

    if (status === 'scheduled') {
      computedScheduled++;
      if (temporalState === 'past_due') {
        computedPastDue++;
      } else {
        computedRemaining++;
      }
    } else if (status === 'completed') {
      computedCompleted++;
    } else if (status === 'no_show') {
      computedNoShow++;
    } else if (status === 'cancelled') {
      computedCancelled++;
    }
  }

  // Summary counts parity check
  if (s.total !== validatedAppointments.length) {
    throw new Error(`TrainerDailyAgenda: summary.total (${s.total}) does not match appointments count (${validatedAppointments.length})`);
  }
  if (s.scheduled !== computedScheduled) {
    throw new Error(`TrainerDailyAgenda: summary.scheduled mismatch`);
  }
  if (s.completed !== computedCompleted) {
    throw new Error(`TrainerDailyAgenda: summary.completed mismatch`);
  }
  if (s.no_show !== computedNoShow) {
    throw new Error(`TrainerDailyAgenda: summary.no_show mismatch`);
  }
  if (s.cancelled !== computedCancelled) {
    throw new Error(`TrainerDailyAgenda: summary.cancelled mismatch`);
  }
  if (s.past_due_scheduled !== computedPastDue) {
    throw new Error(`TrainerDailyAgenda: summary.past_due_scheduled mismatch`);
  }
  if (s.remaining_scheduled !== computedRemaining) {
    throw new Error(`TrainerDailyAgenda: summary.remaining_scheduled mismatch`);
  }

  // Needs terminalization
  if (!Array.isArray(d.needs_terminalization)) {
    throw new Error('TrainerDailyAgenda: needs_terminalization must be an array');
  }
  const validatedNeedsTerminalization: TrainerDailyAgendaAppointment[] = [];
  for (let i = 0; i < d.needs_terminalization.length; i++) {
    const raw = d.needs_terminalization[i];
    if (!raw || typeof raw !== 'object') {
      throw new Error('TrainerDailyAgenda: needs_terminalization item must be object');
    }
    const item = raw as Record<string, unknown>;
    const matched = appointmentIdMap.get(item.id as number);
    if (!matched) {
      throw new Error(`TrainerDailyAgenda: needs_terminalization item ${item.id} not found in appointments`);
    }
    if (matched.status !== 'scheduled' || matched.temporal_state !== 'past_due') {
      throw new Error(`TrainerDailyAgenda: needs_terminalization items must be scheduled and past_due`);
    }
    if (i > 0) {
      const prev = validatedNeedsTerminalization[i - 1];
      if (prev.starts_at > matched.starts_at || (prev.starts_at === matched.starts_at && prev.id >= matched.id)) {
        throw new Error(`TrainerDailyAgenda: needs_terminalization must be sorted by starts_at ASC, id ASC`);
      }
    }
    validatedNeedsTerminalization.push(matched);
  }
  if (validatedNeedsTerminalization.length !== computedPastDue) {
    throw new Error(`TrainerDailyAgenda: needs_terminalization length must match computed past_due count`);
  }

  // Focus
  if (!d.focus || typeof d.focus !== 'object') {
    throw new Error('TrainerDailyAgenda: focus must be an object');
  }
  const f = d.focus as Record<string, unknown>;

  let focusCurrent: TrainerDailyAgendaAppointment | null = null;
  if (f.current !== null) {
    if (!f.current || typeof f.current !== 'object') {
      throw new Error('TrainerDailyAgenda: focus.current must be object or null');
    }
    const c = f.current as Record<string, unknown>;
    const matched = appointmentIdMap.get(c.id as number);
    if (!matched) {
      throw new Error('TrainerDailyAgenda: focus.current not found in appointments');
    }
    if (matched.status !== 'scheduled' || matched.temporal_state !== 'in_progress') {
      throw new Error('TrainerDailyAgenda: focus.current must be scheduled and in_progress');
    }
    focusCurrent = matched;
  }

  let focusNext: TrainerDailyAgendaAppointment | null = null;
  if (f.next !== null) {
    if (!f.next || typeof f.next !== 'object') {
      throw new Error('TrainerDailyAgenda: focus.next must be object or null');
    }
    const n = f.next as Record<string, unknown>;
    const matched = appointmentIdMap.get(n.id as number);
    if (!matched) {
      throw new Error('TrainerDailyAgenda: focus.next not found in appointments');
    }
    if (matched.status !== 'scheduled' || matched.temporal_state !== 'upcoming') {
      throw new Error('TrainerDailyAgenda: focus.next must be scheduled and upcoming');
    }
    focusNext = matched;
  }

  return {
    timezone: 'Europe/Istanbul',
    business_date: businessDate,
    generated_at: d.generated_at as string,
    trainer: {
      id: tr.id as number,
      name: tr.name as string
    },
    summary: {
      total: s.total as number,
      scheduled: s.scheduled as number,
      completed: s.completed as number,
      no_show: s.no_show as number,
      cancelled: s.cancelled as number,
      remaining_scheduled: s.remaining_scheduled as number,
      past_due_scheduled: s.past_due_scheduled as number
    },
    focus: {
      current: focusCurrent,
      next: focusNext
    },
    needs_terminalization: validatedNeedsTerminalization,
    appointments: validatedAppointments
  };
}

export function isTrainerDailyAgenda(data: unknown): data is TrainerDailyAgenda {
  try {
    validateTrainerDailyAgenda(data);
    return true;
  } catch {
    return false;
  }
}
