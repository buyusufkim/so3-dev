import { V31MediaPlaceholder } from "./V31MediaPlaceholder";

export function V31Hero() {
  return (
    <section id="so3" className="relative h-[90svh] min-h-[600px] flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* Background Image / Placeholder */}
      <div className="absolute inset-0 z-0">
        <V31MediaPlaceholder label="HERO PHOTO" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent"></div>
      </div>
      
      <div className="container relative z-10 mx-auto px-6 lg:px-12 w-full h-full flex flex-col justify-end pb-16 md:pb-24">
        
        <div className="mb-6 md:mb-8 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#851C35]"></span>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            SO3 / PERSONAL TRAINING
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          
          {/* Main Typography */}
          <div className="max-w-4xl">
            <h1 className="flex flex-col gap-1 md:gap-2">
              <span className="text-4xl sm:text-5xl md:text-7xl lg:text-[6.5rem] font-medium tracking-tighter leading-[1] text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.7)]">
                Herkese göre değil.
              </span>
              <span className="text-5xl sm:text-6xl md:text-8xl lg:text-[8rem] font-bold tracking-tighter leading-[0.9] text-white">
                SANA GÖRE.
              </span>
            </h1>
            
            <div className="mt-8 md:mt-10 max-w-xl">
              <p className="text-lg md:text-2xl text-white/90 font-medium leading-snug">
                Kalabalığa değil, gelişimine odaklan.
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm md:text-base text-white/50 font-medium">
                <span>Kişiye özel antrenman</span>
                <span className="text-[#851C35] font-bold">·</span>
                <span>Birebir takip</span>
              </div>
            </div>
          </div>

          {/* CTA Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full sm:w-auto min-w-[220px]">
            <a 
              href="#" 
              className="flex items-center justify-center bg-white text-black px-6 py-4 md:py-5 rounded text-xs md:text-sm font-bold uppercase tracking-[0.15em] hover:bg-[#851C35] hover:text-white transition-all group"
            >
              <span>Ön Görüşme Planla</span>
              <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a 
              href="#kesfet" 
              className="flex items-center justify-center bg-transparent border border-white/20 text-white px-6 py-4 md:py-5 rounded text-xs md:text-sm font-bold uppercase tracking-[0.15em] hover:bg-white/10 transition-colors group"
            >
              <span>SO3'ü Keşfet</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
