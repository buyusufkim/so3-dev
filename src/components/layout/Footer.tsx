export function Footer() {
  return (
    <footer data-site-footer className="relative bg-[#050505] text-white pt-12 md:pt-16 pb-8 px-4 sm:px-6 lg:px-12 border-t border-white/5 bg-so3-grain bg-so3-geometry">
      <div className="container mx-auto max-w-7xl relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-12 md:mb-16">
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

          {/* Right: Info */}
          <div className="flex flex-col sm:flex-row gap-12 sm:gap-24 md:text-right">
             <div className="flex flex-col md:items-end">
               <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Çalışma Saatleri</span>
               <span className="text-sm md:text-base text-white/80 font-medium">Pazartesi – Cumartesi</span>
               <span className="text-sm md:text-base text-white/80 font-medium">06:00 – 22:00</span>
             </div>
             
             <div className="flex flex-col md:items-end">
               <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Sosyal</span>
               <div className="flex items-center gap-5">
                  <a href="https://www.instagram.com/so3pt/" target="_blank" rel="noopener noreferrer" aria-label="SO3 Instagram">
                     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white hover:text-white/70 transition-colors"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </a>
                  <a href="https://wa.me/905523790777" target="_blank" rel="noopener noreferrer" aria-label="SO3 WhatsApp">
                     <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-white hover:text-white/70 transition-colors"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </a>
               </div>
             </div>
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
