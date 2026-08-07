import { Link } from "react-router-dom";
import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function TrainerBranches() {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Branşlara Göz At</h2>
          <p className="text-base text-[#0A0A0A]/60 max-w-xl">
            Fitness, Yoga & Pilates ve Boks alanlarını keşfet; sana uygun çalışma yönünü birlikte belirle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Link to="/branslar#fitness" className="group relative rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[250px] flex flex-col justify-end p-6 cursor-pointer">
            <div className="absolute inset-0 z-0">
              <HomeMediaPlaceholder label="FITNESS" aspectRatio="auto" className="w-full h-full transition-transform duration-700 group-hover:scale-105" light />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
            
            <div className="relative z-20 flex justify-between items-end">
              <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Fitness</h3>
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>

          <Link to="/branslar#yoga-pilates" className="group relative rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[250px] flex flex-col justify-end p-6 cursor-pointer">
            <div className="absolute inset-0 z-0">
              <HomeMediaPlaceholder label="YOGA & PİLATES" aspectRatio="auto" className="w-full h-full transition-transform duration-700 group-hover:scale-105" light />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
            
            <div className="relative z-20 flex justify-between items-end">
              <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Yoga &<br />Pilates</h3>
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>

          <Link to="/branslar#boks" className="group relative rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[250px] flex flex-col justify-end p-6 cursor-pointer">
            <div className="absolute inset-0 z-0">
              <HomeMediaPlaceholder label="BOKS" aspectRatio="auto" className="w-full h-full transition-transform duration-700 group-hover:scale-105" light />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
            
            <div className="relative z-20 flex justify-between items-end">
              <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Boks</h3>
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
