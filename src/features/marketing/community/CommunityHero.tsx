import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function CommunityHero() {
  return (
    <section className="relative h-[65svh] md:h-[80svh] min-h-[500px] flex items-center justify-center bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <HomeMediaPlaceholder label="SO3 TOPLULUK" className="w-full h-full object-cover opacity-70 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505]/40"></div>
      </div>
      
      <div className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col items-center justify-center text-center mt-12 md:mt-16">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
            SO3 / TOPLULUK
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] text-white mb-4 md:mb-6 max-w-4xl">
          Antrenman biter.<br />
          SO3 devam eder.
        </h1>
        <p className="text-lg md:text-xl text-white/70 font-medium max-w-2xl mx-auto leading-relaxed mb-4">
          SO3 birlikteliği salonla sınırlı kalmaz.
        </p>
        <p className="text-sm md:text-base text-white/50 font-medium max-w-xl mx-auto leading-relaxed">
          Voleybol, doğa yürüyüşleri, kano ve piknik gibi etkinliklerde üyeler farklı ortamlarda bir araya gelir.
        </p>
      </div>
    </section>
  );
}
