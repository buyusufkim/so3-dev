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

