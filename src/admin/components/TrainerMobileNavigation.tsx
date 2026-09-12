import { NavLink, useLocation } from "react-router-dom";
import { Home, CalendarDays, Users, LogOut } from "lucide-react";

type TrainerMobileNavigationProps = {
  onLogout: () => void | Promise<void>;
  displayName: string;
};

export function TrainerMobileNavigation({ onLogout, displayName }: TrainerMobileNavigationProps) {
  const location = useLocation();

  const isMembersActive = location.pathname.startsWith('/admin/my-members');
  const isAppointmentsActive = location.pathname.startsWith('/admin/my-appointments');
  const isHomeActive = location.pathname === '/admin/trainer';

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[#121212] border-b border-white/10 lg:hidden">
        <div className="flex items-center gap-3">
          <img src="/brand/so3-logo.png" alt="SO3" className="h-6 w-auto object-contain" />
          <span className="text-sm font-medium text-white truncate max-w-[120px]">{displayName}</span>
        </div>
        <button
          onClick={onLogout}
          type="button"
          aria-label="Çıkış Yap"
          className="text-white/50 hover:text-white transition-colors p-2 -mr-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav 
        aria-label="Eğitmen navigasyonu"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#121212] border-t border-white/10 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex items-center justify-around h-16">
          <NavLink
            to="/admin/trainer"
            end
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isHomeActive ? 'text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            <Home className={`w-5 h-5 ${isHomeActive ? 'text-[#851C35]' : ''}`} />
            <span className="text-[10px] font-medium">Ana Sayfa</span>
          </NavLink>

          <NavLink
            to="/admin/my-appointments"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isAppointmentsActive ? 'text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            <CalendarDays className={`w-5 h-5 ${isAppointmentsActive ? 'text-[#851C35]' : ''}`} />
            <span className="text-[10px] font-medium">Randevular</span>
          </NavLink>

          <NavLink
            to="/admin/my-members"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isMembersActive ? 'text-white' : 'text-white/40 hover:text-white/80'
            }`}
          >
            <Users className={`w-5 h-5 ${isMembersActive ? 'text-[#851C35]' : ''}`} />
            <span className="text-[10px] font-medium">Üyeler</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
