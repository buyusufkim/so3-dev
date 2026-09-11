import React, { useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { LogOut } from 'lucide-react';

export function MemberLayout() {
  const { identity, isLoading, isAuthenticated, logout, authError, retryAuth } = useMemberAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set noindex
    const metaRobots = document.querySelector('meta[name="robots"]');
    let originalContent = '';
    if (metaRobots) {
      originalContent = metaRobots.getAttribute('content') || '';
      metaRobots.setAttribute('content', 'noindex,nofollow');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'robots';
      newMeta.content = 'noindex,nofollow';
      document.head.appendChild(newMeta);
    }
    return () => {
      // Restore on unmount
      if (metaRobots) {
        metaRobots.setAttribute('content', originalContent);
      } else {
        const addedMeta = document.querySelector('meta[name="robots"]');
        if (addedMeta) document.head.removeChild(addedMeta);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50 text-sm">
        Yükleniyor...
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white/70 px-4">
        <div className="bg-[#121212] p-8 rounded-xl border border-white/10 max-w-sm w-full text-center">
          <div className="text-red-400 mb-6 font-medium">{authError}</div>
          <button
            onClick={retryAuth}
            className="px-6 py-2 bg-[#851C35] hover:bg-[#851C35]/90 text-white rounded-lg transition-colors text-sm w-full"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/uye/giris', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#851C35] selection:text-white">
      <header className="border-b border-white/10 bg-[#121212] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brand/so3-logo.png" alt="SO3" className="h-6 w-auto object-contain" />
          </div>
          
          {isAuthenticated && identity && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm text-white/70">
                {identity.member.first_name} {identity.member.last_name}
              </div>
              <button 
                onClick={handleLogout}
                className="text-white/50 hover:text-white transition-colors p-2 -mr-2"
                title="Çıkış Yap"
                type="button"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
