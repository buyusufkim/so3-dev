import { ConceptMediaPlaceholder } from "./ConceptMediaPlaceholder";

export function ConceptHero() {
  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex flex-col justify-end pt-32 pb-12 px-6 lg:px-12 bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40">
        <ConceptMediaPlaceholder label="Premium Photography" className="h-full w-full object-cover" />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent z-0"></div>

      <div className="container relative z-10 mx-auto max-w-none w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-medium tracking-tight text-[#F9F9F9] leading-[1.05]">
              Herkese göre değil.<br />
              <span className="text-[#888888]">Sana göre.</span>
            </h1>
            <p className="mt-8 text-xl md:text-2xl font-normal text-[#CCCCCC] max-w-xl leading-snug tracking-tight">
              Kalabalığa değil, gelişimine odaklan.
            </p>
            <p className="mt-4 text-base md:text-lg text-[#888888]">
              Kişiye özel antrenman. Birebir takip.
            </p>
          </div>

          <div className="flex flex-col space-y-6 md:min-w-[200px]">
            <a href="#" className="group flex items-center justify-between border-b border-[#333333] pb-4 hover:border-[#888888] transition-colors">
              <span className="text-[#F9F9F9] text-sm tracking-wide">Ön görüşme planla</span>
              <span className="text-[#F9F9F9] transform transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a href="#" className="group flex items-center justify-between border-b border-[#333333] pb-4 hover:border-[#888888] transition-colors">
              <span className="text-[#888888] text-sm tracking-wide group-hover:text-[#F9F9F9] transition-colors">SO3'ü keşfet</span>
              <span className="text-[#888888] transform transition-transform group-hover:translate-x-1 group-hover:text-[#F9F9F9]">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
