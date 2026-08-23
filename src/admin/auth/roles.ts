export type AdminRole = 'super_admin' | 'admin' | 'editor' | 'trainer' | 'reception';

export interface AdminUser {
  id: number;
  email: string;
  role: AdminRole;
  display_name: string;
}

export const getRoleStartRoute = (role: AdminRole): string => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'editor':
      return '/admin/homepage';
    case 'trainer':
      return '/admin/my-members';
    case 'reception':
      return '/admin/reception';
    default:
      return '/admin/login';
  }
};

export const hasRoleAccess = (role: AdminRole, pathname: string): boolean => {
  if (role === 'super_admin' || role === 'admin') return true;
  
  if (role === 'trainer') {
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
