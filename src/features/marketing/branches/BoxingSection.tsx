import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function BoxingSection() {
  return (
    <section id="boks" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#050505] text-white scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
          <div className="w-full lg:w-1/2 flex flex-col gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#851C35]">03</span>
              <span className="w-8 h-[1px] bg-white/20"></span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-[5rem] font-bold tracking-tighter leading-[0.9]">Boks</h2>
            <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed max-w-lg">
              Teknik, kondisyon ve koordinasyonu bir araya getiren birebir çalışmalar.
            </p>
            <div className="pt-6 border-t border-white/10 mt-2">
              <p className="text-sm md:text-base text-white/50 leading-relaxed max-w-lg">
                Teknik çalışma ile kondisyonu bir araya getiren, kişiye göre şekillenen bir antrenman süreci.
              </p>
            </div>
          </div>
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden border border-white/10 relative h-[300px] md:h-[450px] mt-8 md:mt-16">
              <HomeMediaPlaceholder label="BOKS TEKNİK" aspectRatio="auto" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-lg overflow-hidden border border-white/10 relative h-[300px] md:h-[450px]">
              <HomeMediaPlaceholder label="BOKS KONDİSYON" aspectRatio="auto" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
