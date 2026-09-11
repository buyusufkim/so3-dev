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
  if (!data || typeof data !== 'object') throw new Error('Invalid identity');
  const d = data as Record<string, unknown>;

  if (!d.account || typeof d.account !== 'object') throw new Error('Invalid account');
  const a = d.account as Record<string, unknown>;
  
  if (typeof a.id !== 'number' || a.id <= 0) throw new Error('Invalid account id');
  if (typeof a.uuid !== 'string' || !a.uuid) throw new Error('Invalid account uuid');
  if (typeof a.username !== 'string' || !a.username) throw new Error('Invalid username');
  if (a.status !== 'active') throw new Error('Invalid account status');
  if (typeof a.must_change_password !== 'boolean') throw new Error('Invalid must_change_password');

  if (!d.member || typeof d.member !== 'object') throw new Error('Invalid member');
  const m = d.member as Record<string, unknown>;

  if (typeof m.id !== 'number' || m.id <= 0) throw new Error('Invalid member id');
  if (typeof m.uuid !== 'string' || !m.uuid) throw new Error('Invalid member uuid');
  if (typeof m.first_name !== 'string' || !m.first_name) throw new Error('Invalid member first_name');
  if (typeof m.last_name !== 'string' || !m.last_name) throw new Error('Invalid member last_name');
  if (m.status !== 'active') throw new Error('Invalid member status');

  return {
    account: {
      id: a.id,
      uuid: a.uuid,
      username: a.username,
      status: 'active',
      must_change_password: a.must_change_password
    },
    member: {
      id: m.id,
      uuid: m.uuid,
      first_name: m.first_name,
      last_name: m.last_name,
      status: 'active'
    }
  };
}

export type MemberOverview = {
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    status: string;
  };
  membership: {
    membership_start_date: string | null;
    membership_end_date: string | null;
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
  if (!data || typeof data !== 'object') throw new Error('Invalid overview');
  const d = data as Record<string, unknown>;

  const m = d.member as Record<string, unknown>;
  const ms = d.membership as Record<string, unknown>;
  const t = d.trainer as Record<string, unknown> | null;

  return {
    member: {
      id: typeof m?.id === 'number' ? m.id : 0,
      uuid: typeof m?.uuid === 'string' ? m.uuid : '',
      first_name: typeof m?.first_name === 'string' ? m.first_name : '',
      last_name: typeof m?.last_name === 'string' ? m.last_name : '',
      status: typeof m?.status === 'string' ? m.status : ''
    },
    membership: {
      membership_start_date: typeof ms?.membership_start_date === 'string' ? ms.membership_start_date : null,
      membership_end_date: typeof ms?.membership_end_date === 'string' ? ms.membership_end_date : null,
      status: ['active', 'upcoming', 'expired', 'not_set'].includes(ms?.status as string) ? (ms.status as any) : 'not_set'
    },
    trainer: t ? {
      id: typeof t.id === 'number' ? t.id : 0,
      uuid: typeof t.uuid === 'string' ? t.uuid : '',
      name: typeof t.name === 'string' ? t.name : '',
      role_title: typeof t.role_title === 'string' ? t.role_title : ''
    } : null
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
  effective_status: 'active' | 'expired' | 'exhausted' | 'cancelled';
};

export function validateSessionPackages(data: unknown): MemberSessionPackage[] {
  if (!data || typeof data !== 'object') throw new Error('Invalid packages');
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.items)) throw new Error('Invalid items array');
  
  return d.items.map((i: any) => ({
    id: typeof i.id === 'number' ? i.id : 0,
    uuid: typeof i.uuid === 'string' ? i.uuid : '',
    package_name: typeof i.package_name === 'string' ? i.package_name : '',
    total_sessions: typeof i.total_sessions === 'number' ? i.total_sessions : 0,
    remaining_sessions: typeof i.remaining_sessions === 'number' ? i.remaining_sessions : 0,
    reserved_sessions: typeof i.reserved_sessions === 'number' ? i.reserved_sessions : 0,
    valid_from: typeof i.valid_from === 'string' ? i.valid_from : null,
    valid_until: typeof i.valid_until === 'string' ? i.valid_until : null,
    effective_status: ['active', 'expired', 'exhausted', 'cancelled'].includes(i.effective_status) ? i.effective_status : 'cancelled'
  }));
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
  if (!data || typeof data !== 'object') throw new Error('Invalid appointments');
  const d = data as Record<string, unknown>;
  
  const mapAppt = (i: any): MemberAppointment => ({
    id: typeof i.id === 'number' ? i.id : 0,
    uuid: typeof i.uuid === 'string' ? i.uuid : '',
    starts_at: typeof i.starts_at === 'string' ? i.starts_at : '',
    ends_at: typeof i.ends_at === 'string' ? i.ends_at : '',
    status: ['scheduled', 'completed', 'cancelled', 'no_show'].includes(i.status) ? i.status : 'cancelled',
    cancellation_reason: typeof i.cancellation_reason === 'string' ? i.cancellation_reason : null,
    trainer: i.trainer ? {
      id: typeof i.trainer.id === 'number' ? i.trainer.id : 0,
      uuid: typeof i.trainer.uuid === 'string' ? i.trainer.uuid : '',
      name: typeof i.trainer.name === 'string' ? i.trainer.name : '',
      role_title: typeof i.trainer.role_title === 'string' ? i.trainer.role_title : ''
    } : null,
    session_package: i.session_package ? {
      id: typeof i.session_package.id === 'number' ? i.session_package.id : 0,
      package_name: typeof i.session_package.package_name === 'string' ? i.session_package.package_name : ''
    } : null
  });

  return {
    upcoming: Array.isArray(d.upcoming) ? d.upcoming.map(mapAppt) : [],
    recent: Array.isArray(d.recent) ? d.recent.map(mapAppt) : []
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
  if (!data || typeof data !== 'object') throw new Error('Invalid training programs');
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.items)) throw new Error('Invalid items array');

  return d.items.map((i: any) => ({
    id: typeof i.id === 'number' ? i.id : 0,
    uuid: typeof i.uuid === 'string' ? i.uuid : '',
    title: typeof i.title === 'string' ? i.title : '',
    start_date: typeof i.start_date === 'string' ? i.start_date : null,
    end_date: typeof i.end_date === 'string' ? i.end_date : null,
    trainer: i.trainer ? {
      id: typeof i.trainer.id === 'number' ? i.trainer.id : 0,
      uuid: typeof i.trainer.uuid === 'string' ? i.trainer.uuid : '',
      name: typeof i.trainer.name === 'string' ? i.trainer.name : '',
      role_title: typeof i.trainer.role_title === 'string' ? i.trainer.role_title : ''
    } : null,
    exercises: Array.isArray(i.exercises) ? i.exercises.map((ex: any) => ({
      id: typeof ex.id === 'number' ? ex.id : 0,
      exercise_name: typeof ex.exercise_name === 'string' ? ex.exercise_name : '',
      sets: typeof ex.sets === 'number' ? ex.sets : null,
      repetitions: typeof ex.repetitions === 'string' ? ex.repetitions : null,
      duration_seconds: typeof ex.duration_seconds === 'number' ? ex.duration_seconds : null,
      rest_seconds: typeof ex.rest_seconds === 'number' ? ex.rest_seconds : null,
      instructions: typeof ex.instructions === 'string' ? ex.instructions : null,
      sort_order: typeof ex.sort_order === 'number' ? ex.sort_order : 0
    })) : []
  }));
}
