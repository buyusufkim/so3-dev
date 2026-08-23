import { Outlet, Navigate, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

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
  if (role === 'trainer') return pathname.startsWith('/admin/my-members');
  if (role === 'reception') return pathname.startsWith('/admin/reception');
  if (role === 'editor') {
    const cmsRoutes = ['/admin/homepage', '/admin/branches', '/admin/trainers', '/admin/events', '/admin/media'];
    return cmsRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
  }
  return false;
};

export function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-2 py-2 text-sm rounded transition-colors ${
      isActive
        ? 'bg-white/10 text-white font-medium'
        : 'text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiClient.get('/api/auth/me');
        setAdmin(data as AdminUser);
        setIsAuthenticated(true);
      } catch (err: unknown) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [location.pathname]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      navigate('/admin/login', { replace: true });
    };
    window.addEventListener('so3_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('so3_auth_expired', handleAuthExpired);
  }, [navigate]);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Yükleniyor...</div>;
  }

  if (!isAuthenticated && location.pathname !== '/admin/login') {
    return <Navigate to="/admin/login" replace />;
  }

  if (isAuthenticated && admin) {
    if (location.pathname === '/admin/login') {
      return <Navigate to={getRoleStartRoute(admin.role)} replace />;
    }
    
    // Boundary check
    if (!hasRoleAccess(admin.role, location.pathname)) {
      return <Navigate to={getRoleStartRoute(admin.role)} replace />;
    }
  }

  if (!isAuthenticated) {
    return <Outlet />;
  }

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/auth/logout', {});
      apiClient.clearAuth();
      setIsAuthenticated(false);
      navigate('/admin/login');
    } catch (err: unknown) {
      console.error('Logout failed');
    }
  };

  const isSuperOrAdmin = admin?.role === 'super_admin' || admin?.role === 'admin';
  const isEditor = admin?.role === 'editor';
  const isTrainer = admin?.role === 'trainer';
  const isReception = admin?.role === 'reception';
  const showCMS = isSuperOrAdmin || isEditor;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <img src="/brand/so3-logo.png" alt="SO3 Control" className="h-8" />
          <div className="mt-2 text-xs font-semibold tracking-widest text-[#851C35]">CONTROL</div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-8">
          {isSuperOrAdmin && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Genel</h3>
              <div className="space-y-1">
                <NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/admin/settings" className={navLinkClass}>Ayarlar</NavLink>
              </div>
            </div>
          )}
          
          {showCMS && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">İçerik</h3>
              <div className="space-y-1">
                <NavLink to="/admin/homepage" className={navLinkClass}>Ana Sayfa</NavLink>
                <NavLink to="/admin/branches" className={navLinkClass}>Branşlar</NavLink>
                <NavLink to="/admin/trainers" className={navLinkClass}>Eğitmenler</NavLink>
                <NavLink to="/admin/events" className={navLinkClass}>Etkinlikler</NavLink>
                <NavLink to="/admin/media" className={navLinkClass}>Medya</NavLink>
              </div>
            </div>
          )}
          
          {isSuperOrAdmin && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Operasyon</h3>
              <div className="space-y-1">
                <NavLink to="/admin/members" className={navLinkClass}>Üyeler</NavLink>
              </div>
            </div>
          )}
          
          {isTrainer && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Eğitmen</h3>
              <div className="space-y-1">
                <NavLink to="/admin/my-members" className={navLinkClass}>Bana Atanan Üyeler</NavLink>
              </div>
            </div>
          )}

          {isReception && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Operasyon</h3>
              <div className="space-y-1">
                <NavLink to="/admin/reception" className={navLinkClass}>Resepsiyon</NavLink>
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="text-sm font-medium mb-1 truncate">{admin?.display_name || 'Admin'}</div>
          <div className="text-xs text-white/50 mb-4 truncate">{admin?.email}</div>
          <button 
            onClick={handleLogout}
            className="w-full py-2 text-xs font-medium border border-white/20 rounded hover:bg-white/10 transition"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold">SO3 Control</h1>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
