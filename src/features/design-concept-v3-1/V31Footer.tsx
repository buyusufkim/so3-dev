import { Link } from "react-router-dom";

export function V31Footer() {
  return (
    <>
      <div className="bg-[#050505] py-5 md:py-6 overflow-hidden border-t border-white/10 flex items-center relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>
        
        <div className="flex whitespace-nowrap opacity-40">
          <div className="animate-[marquee_20s_linear_infinite] flex items-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white mx-6">HERKESE GÖRE DEĞİL</span>
            <span className="w-1 h-1 bg-[#851C35] rounded-full"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white mx-6">SANA GÖRE</span>
            <span className="w-1 h-1 bg-[#851C35] rounded-full"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white mx-6">SO3 PT</span>
            <span className="w-1 h-1 bg-[#851C35] rounded-full"></span>
          </div>
          
          <div className="animate-[marquee_20s_linear_infinite] flex items-center" aria-hidden="true">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white mx-6">HERKESE GÖRE DEĞİL</span>
            <span className="w-1 h-1 bg-[#851C35] rounded-full"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white mx-6">SANA GÖRE</span>
            <span className="w-1 h-1 bg-[#851C35] rounded-full"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white mx-6">SO3 PT</span>
            <span className="w-1 h-1 bg-[#851C35] rounded-full"></span>
          </div>
        </div>
      </div>

      <footer className="bg-[#0A0A0A] text-white py-12 md:py-20 px-4 sm:px-6 lg:px-12 border-t border-white/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            
            <div className="flex flex-col space-y-3">
              <Link to="/design-concept-v3-1" className="text-xl md:text-2xl font-bold tracking-tighter text-white">
                SO3 PT
              </Link>
              <p className="text-xs md:text-sm font-medium text-white/50 max-w-xs leading-relaxed uppercase tracking-[0.1em]">
                Kişiye özel antrenman.<br />
                Birebir takip.
              </p>
            </div>

            <div className="flex flex-col md:text-right space-y-2">
              <p className="text-xs md:text-sm font-medium text-white/50 uppercase tracking-[0.1em]">
                Kayseri, Türkiye
              </p>
              <p className="text-xs md:text-sm font-medium text-white/50 uppercase tracking-[0.1em]">
                so3pt.com.tr
              </p>
            </div>

          </div>
        </div>
      </footer>
    </>
  );
}
