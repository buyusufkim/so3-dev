import { Outlet, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [admin, setAdmin] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiClient.get('/api/auth/me');
        setAdmin(data);
        setIsAuthenticated(true);
      } catch (err) {
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

  if (isAuthenticated && location.pathname === '/admin/login') {
    return <Navigate to="/admin" replace />;
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
    } catch (err) {
      console.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <img src="/brand/so3-logo.png" alt="SO3 Control" className="h-8" />
          <div className="mt-2 text-xs font-semibold tracking-widest text-[#851C35]">CONTROL</div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-8">
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Genel</h3>
            <div className="space-y-1">
              <Link to="/admin" className="flex items-center px-2 py-2 text-sm text-white bg-white/5 rounded">Dashboard</Link>
              <Link to="/admin/settings" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition-colors">Ayarlar</Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">İçerik</h3>
            <div className="space-y-1">
              <Link to="/admin/homepage" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Ana Sayfa</Link>
              <Link to="/admin/branches" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Branşlar</Link>
              <Link to="/admin/trainers" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Eğitmenler</Link>
              <Link to="/admin/events" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Etkinlikler</Link>
              <Link to="/admin/media" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Medya</Link>
            </div>
          </div>
          
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 px-2">Yakında</h3>
            <div className="space-y-1">
              {/* Other disabled items can go here */}
            </div>
          </div>
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
