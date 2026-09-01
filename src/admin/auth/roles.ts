export type AdminRole = 'super_admin' | 'admin' | 'editor' | 'trainer' | 'reception';

export interface AdminUser {
  id: number;
  email: string;
  role: AdminRole;
  display_name: string;
}

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ['super_admin', 'admin', 'editor', 'trainer', 'reception'].includes(value);
}

export function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== 'object') return false;
  
  const user = value as Record<string, unknown>;
  
  if (typeof user.id !== 'number' || !Number.isInteger(user.id) || user.id <= 0) return false;
  if (typeof user.email !== 'string') return false;
  if (typeof user.display_name !== 'string') return false;
  if (!isAdminRole(user.role)) return false;
  
  return true;
}

export const getRoleStartRoute = (role: AdminRole): string => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'editor':
      return '/admin/homepage';
    case 'trainer':
      return '/admin/trainer';
    case 'reception':
      return '/admin/reception';
    default:
      return '/admin/login';
  }
};

export const hasRoleAccess = (role: AdminRole, pathname: string): boolean => {
  if (role === 'super_admin' || role === 'admin') return true;
  
  if (role === 'trainer') {
    if (pathname === '/admin/trainer') return true;
    const basePath = '/admin/my-members';
    return pathname === basePath || pathname.startsWith(basePath + '/');
  }
  
  if (role === 'reception') {
    const basePath = '/admin/reception';
    return pathname === basePath || pathname.startsWith(basePath + '/');
  }
  
  if (role === 'editor') {
    const cmsRoutes = ['/admin/homepage', '/admin/branches', '/admin/trainers', '/admin/events', '/admin/media'];
    return cmsRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
  }
  
  return false;
};
