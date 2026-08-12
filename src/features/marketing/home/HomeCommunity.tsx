export function HomeCommunity() {
  return (
    <section id="topluluk" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
              SO3 / TOPLULUK
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05] mb-8">
            SO3 Ailesi Çok Sosyal
          </h2>
          <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium max-w-2xl mx-auto">
            İlk günden beridir prensibimiz sadece bir spor salonu değil hayat dolu bir aile olmaktı. Öyle de olduk! SO3 ile kano etkinlikleri, doğa yürüyüşleri, takımlı müsabakalar, salon içi toplu antrenman etkinlikleri, kahvaltı buluşmaları gibi yılın her ayını dolu dolu geçiriyoruz.
          </p>
        </div>

        {/* Community Editorial Mosaic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2 gap-4 md:gap-6 lg:h-[460px]">
          
          <div className="lg:col-span-5 lg:row-span-2 group relative rounded-md overflow-hidden bg-black h-[280px] lg:h-auto">
            <img src="/media/so3/community-nature-walk.webp" alt="Doğa Yürüyüşü" loading="lazy" className="w-full h-full object-cover opacity-90 saturate-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#0A0A0A]/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-widest block drop-shadow-md">Doğa Yürüyüşleri</span>
            </div>
          </div>
          
          <div className="lg:col-span-3 lg:row-span-2 group relative rounded-md overflow-hidden bg-black h-[280px] lg:h-auto">
            <img src="/media/so3/community-kano.webp" alt="Kano Etkinliği" loading="lazy" className="w-full h-full object-cover opacity-90 saturate-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#0A0A0A]/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-widest block drop-shadow-md">Kano Etkinlikleri</span>
            </div>
          </div>
            
          <div className="lg:col-span-4 lg:row-span-1 group relative rounded-md overflow-hidden bg-black h-[220px] lg:h-auto">
            <img src="/media/so3/community-team-games.webp" alt="Takımlı Oyunlar" loading="lazy" className="w-full h-full object-cover opacity-90 saturate-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#0A0A0A]/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-widest block drop-shadow-md">Takımlı Oyunlar<br/><span className="text-[10px] text-white/70 block mt-0.5">Voleybol · Futbol</span></span>
            </div>
          </div>
          
          <div className="lg:col-span-4 lg:row-span-1 group relative rounded-md overflow-hidden bg-black h-[220px] lg:h-auto">
            <img src="/media/so3/community-group-training.webp" alt="Salon İçi Toplu Antrenmanlar" loading="lazy" className="w-full h-full object-cover object-[center_60%] opacity-90 saturate-[0.85] contrast-[1.05] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#0A0A0A]/10 to-transparent opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
              <span className="text-xs font-bold uppercase tracking-widest block drop-shadow-md">Salon İçi<br/>Toplu Antrenmanlar</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
