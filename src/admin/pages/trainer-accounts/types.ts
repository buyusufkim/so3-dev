export interface TrainerAccountTrainer {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface TrainerAccountDetails {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: 'trainer';
  status: 'active' | 'inactive';
  last_login_at: string | null;
  password_changed_at: string | null;
}

export interface TrainerAccountRow {
  trainer: TrainerAccountTrainer;
  account: TrainerAccountDetails | null;
}

export function isTrainerAccountTrainer(obj: unknown): obj is TrainerAccountTrainer {
  if (typeof obj !== 'object' || obj === null) return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.id === 'number' && Number.isInteger(t.id) && t.id > 0 &&
    typeof t.name === 'string' &&
    typeof t.slug === 'string' &&
    typeof t.is_active === 'boolean'
  );
}

export function isTrainerAccountDetails(obj: unknown): obj is TrainerAccountDetails {
  if (typeof obj !== 'object' || obj === null) return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.id === 'number' && Number.isInteger(a.id) && a.id > 0 &&
    typeof a.username === 'string' &&
    typeof a.email === 'string' &&
    typeof a.display_name === 'string' &&
    a.role === 'trainer' &&
    (a.status === 'active' || a.status === 'inactive') &&
    (a.last_login_at === null || typeof a.last_login_at === 'string') &&
    (a.password_changed_at === null || typeof a.password_changed_at === 'string')
  );
}

export function isTrainerAccountRow(obj: unknown): obj is TrainerAccountRow {
  if (typeof obj !== 'object' || obj === null) return false;
  const r = obj as Record<string, unknown>;
  return (
    isTrainerAccountTrainer(r.trainer) &&
    (r.account === null || isTrainerAccountDetails(r.account))
  );
}

export function isTrainerAccountRows(obj: unknown): obj is TrainerAccountRow[] {
  if (!Array.isArray(obj)) return false;
  return obj.every(isTrainerAccountRow);
}
