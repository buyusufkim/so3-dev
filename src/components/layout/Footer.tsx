import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer data-site-footer className="relative bg-[#050505] text-white pt-12 md:pt-16 pb-8 px-4 sm:px-6 lg:px-12 border-t border-white/5 bg-so3-grain bg-so3-geometry">
      <div className="container mx-auto max-w-7xl relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-12 md:mb-16">
          {/* Left: Logo */}
          <div className="flex flex-col">
            <img src="/brand/so3-logo.png" alt="SO3 PT" className="h-12 md:h-16 w-auto object-contain mb-6" />
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                SO3 / PERSONAL TRAINING
              </span>
            </div>
          </div>

          {/* Right: Slogan */}
          <div className="md:text-right">
            <p className="text-xl md:text-2xl text-white/80 font-medium leading-relaxed">
              Kişiye özel antrenman.<br className="hidden md:block" />
              Birebir takip.
            </p>
          </div>
        </div>
        
        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-6 md:mb-8"></div>
        
        {/* Signature Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-sm font-medium text-white/50">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
            <span className="font-bold text-white tracking-tighter text-lg md:mr-4">SO3 PT</span>
            <span>Kayseri, Türkiye</span>
            <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20"></span>
            <span>so3pt.com.tr</span>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
