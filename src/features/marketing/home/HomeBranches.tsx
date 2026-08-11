export function HomeBranches() {
  return (
    <section id="branslar" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#050505] bg-so3-grain bg-so3-geometry text-white scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="mb-16 md:mb-20">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              BRANŞLAR
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] max-w-3xl">
            Farklı disiplinler.<br />
            <span className="font-bold">Aynı kişisel yaklaşım.</span>
          </h2>
        </div>

        {/* Editorial Tile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Main Large Tile */}
          <div className="lg:col-span-8 group relative rounded-lg overflow-hidden border border-white/10 min-h-[500px] lg:min-h-[600px] flex flex-col justify-end p-8 md:p-12">
            <div className="absolute inset-0 z-0">
              <img src="/media/so3/branch-fitness.webp" alt="SO3 fitness alanı" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent z-10 opacity-80 group-hover:opacity-90 transition-opacity"></div>
            
            <div className="relative z-20 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#851C35] mb-3 block">01</span>
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 uppercase">Fitness</h3>
                <p className="text-base md:text-lg text-white/70 font-medium max-w-md">
                  Güç, kondisyon ve kişisel hedeflerine göre şekillenen antrenmanlar.
                </p>
              </div>
            </div>
          </div>

          {/* Right Stack */}
          <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">
            
            {/* Secondary Tile 1 */}
            <div className="flex-1 group relative rounded-lg overflow-hidden border border-white/10 min-h-[300px] flex flex-col justify-end p-6 md:p-8 ">
              <div className="absolute inset-0 z-0">
                <img src="/media/so3/branch-yoga-pilates.webp" alt="SO3 yoga ve pilates alanı" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10 opacity-80"></div>
              
              <div className="relative z-20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#851C35] block">02</span>
                </div>
                <h3 className="text-3xl font-bold tracking-tighter mb-2 uppercase">Yoga &<br/>Pilates</h3>
                <p className="text-sm text-white/70 font-medium">
                  Kontrol, denge ve mobilite çalışmaları.
                </p>
              </div>
            </div>

            {/* Secondary Tile 2 */}
            <div className="flex-1 group relative rounded-lg overflow-hidden border border-white/10 min-h-[300px] flex flex-col justify-end p-6 md:p-8 ">
              <div className="absolute inset-0 z-0">
                <img src="/media/so3/branch-boxing.webp" alt="SO3 boks alanı" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10 opacity-80"></div>
              
              <div className="relative z-20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#851C35] block">03</span>
                </div>
                <h3 className="text-3xl font-bold tracking-tighter mb-2 uppercase">Boks</h3>
                <p className="text-sm text-white/70 font-medium">
                  Teknik ve kondisyon odaklı birebir idman.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
