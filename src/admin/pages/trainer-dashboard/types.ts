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

  return true;
}
