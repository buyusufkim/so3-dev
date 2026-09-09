export interface StaffAccount {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'editor' | 'reception';
  status: 'active' | 'inactive';
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
}

export interface StaffAccountListResponse {
  items: StaffAccount[];
}

export function isStaffAccount(obj: unknown): obj is StaffAccount {
  if (typeof obj !== 'object' || obj === null) return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.id === 'number' && Number.isInteger(a.id) && a.id > 0 &&
    typeof a.username === 'string' &&
    typeof a.email === 'string' &&
    typeof a.display_name === 'string' &&
    (a.role === 'admin' || a.role === 'editor' || a.role === 'reception') &&
    (a.status === 'active' || a.status === 'inactive') &&
    (a.last_login_at === null || typeof a.last_login_at === 'string') &&
    (a.password_changed_at === null || typeof a.password_changed_at === 'string') &&
    typeof a.created_at === 'string'
  );
}

export function isStaffAccountListResponse(obj: unknown): obj is StaffAccountListResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const res = obj as Record<string, unknown>;
  if (!Array.isArray(res.items)) return false;
  return res.items.every(isStaffAccount);
}
