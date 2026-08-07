import { Link } from "react-router-dom";
import { HomeMediaPlaceholder } from "./HomeMediaPlaceholder";

export function HomeTrainers() {
  return (
    <section id="egitmenler" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-24 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                SO3 / EKİP
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-tight">
              Doğru insanla çalış.
            </h2>
            <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium leading-relaxed">
              Kişisel antrenman, kişisel ilgiyi gerektirir. Sürecin, çalıştığın eğitmenle birlikte şekillenir.
            </p>
          </div>
          
          <div className="hidden md:block">
            <Link to="/egitmenler" className="group flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
              <span className="relative">
                Kadroyu keşfet
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#0A0A0A] transition-all group-hover:w-full"></span>
              </span>
              <span className="w-6 h-6 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center transform group-hover:translate-x-1 group-hover:border-[#0A0A0A] transition-all">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Trainers Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Dominant Portrait */}
          <div className="lg:col-span-6 flex flex-col group cursor-pointer relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[500px]">
             <HomeMediaPlaceholder label="EĞİTMEN PORTRE" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-8 z-10 pointer-events-none">
                <p className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">FITNESS</p>
             </div>
          </div>

          {/* Supporting Portraits */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            
            <div className="flex flex-col group cursor-pointer relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[240px]">
               <HomeMediaPlaceholder label="EĞİTMEN PORTRE" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.15em]">YOGA & PİLATES</p>
               </div>
            </div>

            <div className="flex flex-col group cursor-pointer relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[240px]">
               <HomeMediaPlaceholder label="EĞİTMEN PORTRE" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.15em]">BOKS</p>
               </div>
            </div>

            <div className="sm:col-span-2 flex flex-col group cursor-pointer relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] min-h-[240px]">
               <HomeMediaPlaceholder label="EĞİTMEN PORTRE" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-6 z-10 pointer-events-none">
                  <p className="text-xs font-bold text-white/80 uppercase tracking-[0.15em]">FITNESS</p>
               </div>
            </div>

          </div>
        </div>
        
        <div className="mt-12 block md:hidden">
          <Link to="/egitmenler" className="group flex items-center justify-between border-b border-[#0A0A0A]/20 pb-4">
            <span className="text-sm font-semibold text-[#0A0A0A]">Kadroyu keşfet</span>
            <span className="text-[#0A0A0A] transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
