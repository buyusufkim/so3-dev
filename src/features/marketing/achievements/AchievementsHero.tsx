import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function AchievementsHero() {
  return (
    <section className="relative h-[45svh] md:h-[60svh] min-h-[400px] flex items-center justify-center bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <HomeMediaPlaceholder label="SO3 PERFORMANS" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
      </div>
      
      <div className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col items-center justify-center text-center mt-12 md:mt-16">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
            SO3 / BAŞARILAR
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] text-white mb-4 md:mb-6 max-w-4xl">
          Emek görünür<br className="hidden md:block" /> olduğunda.
        </h1>
        <p className="text-sm md:text-base text-white/70 font-medium max-w-xl mx-auto leading-relaxed">
          SO3'ün performans ve yarışma tarafındaki gerçek hikâyeler burada yer alacak.
        </p>
      </div>
    </section>
  );
}
