import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Hero() {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center bg-[#09090B] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <V3MediaPlaceholder label="SO3 / PT SESSION" className="w-full h-full object-cover opacity-80" />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/30 to-transparent z-10"></div>
      
      <div className="container relative z-20 mx-auto px-6 lg:px-12 w-full h-full flex flex-col justify-end pb-24 md:pb-32">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-12">
          
          <div className="max-w-4xl">
            <h1 className="text-white flex flex-col gap-2">
              <span className="text-4xl sm:text-5xl md:text-7xl lg:text-[6rem] font-medium tracking-tight leading-[0.9]">
                Herkese göre değil.
              </span>
              <span className="text-5xl sm:text-6xl md:text-8xl lg:text-[8rem] font-bold tracking-tighter leading-[0.9]">
                SANA GÖRE.
              </span>
            </h1>
            <p className="mt-8 text-xl md:text-3xl text-white/90 font-medium max-w-2xl leading-tight">
              Kalabalığa değil, gelişimine odaklan.
            </p>
            <p className="mt-4 text-base md:text-lg text-white/60">
              Kişiye özel antrenman. Birebir takip.
            </p>
          </div>

          <div className="flex flex-col space-y-6 w-full lg:w-auto lg:min-w-[240px]">
            <a href="#" className="group flex items-center justify-between border-b border-white pb-4 hover:border-white/60 transition-colors">
              <span className="text-white text-sm uppercase tracking-widest font-semibold group-hover:text-white/80 transition-colors">Ön görüşme planla</span>
              <span className="text-white transform transition-transform group-hover:translate-x-1 group-hover:text-white/80">→</span>
            </a>
            <a href="#" className="group flex items-center justify-between border-b border-white/20 pb-4 hover:border-white transition-colors">
              <span className="text-white/60 text-sm uppercase tracking-widest font-semibold group-hover:text-white transition-colors">SO3'ü keşfet</span>
              <span className="text-white/60 transform transition-transform group-hover:translate-x-1 group-hover:text-white">→</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
