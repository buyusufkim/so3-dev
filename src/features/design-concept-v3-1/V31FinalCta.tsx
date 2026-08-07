export function V31FinalCta() {
  return (
    <section className="py-24 md:py-40 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          
          <div className="w-2 h-2 rounded-full bg-[#851C35] mb-8 md:mb-12"></div>
          
          <h2 className="text-5xl sm:text-6xl md:text-[5rem] lg:text-[6.5rem] font-medium tracking-tight leading-[0.9] mb-12 flex flex-col items-center">
            <span className="block mb-2 md:mb-4 text-[#0A0A0A]/80">Hedefin sana özel.</span>
            <span className="block font-bold tracking-tighter">SÜRECİN DE<br className="md:hidden" /> ÖYLE OLMALI.</span>
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto min-w-[240px]">
            <a 
              href="#" 
              className="w-full sm:w-auto flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-5 rounded text-xs md:text-sm font-bold uppercase tracking-[0.15em] hover:bg-[#851C35] hover:text-white transition-all group"
            >
              <span>Ön Görüşme Planla</span>
              <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a 
              href="#" 
              className="w-full sm:w-auto flex items-center justify-center bg-transparent border border-[#0A0A0A]/20 text-[#0A0A0A] px-8 py-5 rounded text-xs md:text-sm font-bold uppercase tracking-[0.15em] hover:bg-black/5 transition-colors group"
            >
              <span>İletişim</span>
            </a>
          </div>
          
        </div>
      </div>
    </section>
  );
}
