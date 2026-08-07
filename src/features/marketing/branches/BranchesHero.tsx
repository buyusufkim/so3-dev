import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function BranchesHero() {
  return (
    <section className="relative h-[65svh] min-h-[500px] flex items-center justify-center bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <HomeMediaPlaceholder label="BRANŞLAR HERO" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505]/40"></div>
      </div>
      <div className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col items-center justify-center text-center mt-12 md:mt-16">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
            SO3 / BRANŞLAR
          </span>
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-[5rem] font-medium tracking-tight leading-[1.05] text-white mb-6 md:mb-8 max-w-4xl">
          Farklı disiplinler.<br className="hidden md:block" />
          <span className="font-bold">Aynı kişisel yaklaşım.</span>
        </h1>
        <p className="text-base md:text-lg text-white/70 font-medium max-w-xl mx-auto leading-relaxed">
          Hedefin ve çalışma biçimin değişebilir. SO3'te merkezde her zaman sen varsın.
        </p>
      </div>
    </section>
  );
}
