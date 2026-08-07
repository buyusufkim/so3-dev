export function V3FinalCta() {
  return (
    <section className="py-32 md:py-48 px-6 lg:px-12 bg-[#F4F4F0] text-[#09090B]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-5xl sm:text-6xl md:text-[5rem] lg:text-[7rem] font-medium tracking-tight leading-[0.9] mb-16 flex flex-col items-center">
            <span className="block mb-2 md:mb-4">Hedefin sana özel.</span>
            <span className="block font-bold tracking-tighter">SÜRECİN DE<br className="md:hidden" /> ÖYLE OLMALI.</span>
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-8 md:gap-16">
            <a href="#" className="inline-flex items-center text-lg md:text-xl font-bold uppercase tracking-widest border-b-[3px] border-[#09090B] pb-2 hover:text-[#09090B]/60 hover:border-[#09090B]/60 transition-colors">
              Ön görüşme planla <span className="ml-4">→</span>
            </a>
            <a href="#" className="inline-flex items-center text-sm md:text-base font-bold uppercase tracking-widest text-[#09090B]/50 hover:text-[#09090B] transition-colors">
              İletişim
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
