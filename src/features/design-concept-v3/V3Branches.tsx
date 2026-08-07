import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Branches() {
  return (
    <section className="py-24 md:py-48 px-6 lg:px-12 bg-[#09090B] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-24 md:mb-40">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">Branşlar</h2>
          <p className="text-xl md:text-2xl text-white/60 font-medium max-w-2xl">
            Farklı disiplinler, ortak kalite standardı. Hangi alanda ilerlemek istersen, o alandaki uzman eğitmenle çalışırsın.
          </p>
        </div>

        <div className="flex flex-col space-y-32 md:space-y-48">
          
          {/* Branch 1 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
            <div className="md:col-span-8 order-2 md:order-1 relative">
              <V3MediaPlaceholder label="FITNESS" aspectRatio="wide" className="w-full shadow-2xl" />
            </div>
            <div className="md:col-span-4 order-1 md:order-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 block">01</span>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 uppercase">Fitness</h3>
              <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed">
                Güç, kondisyon ve kişisel hedeflerine göre şekillenen antrenmanlar.
              </p>
            </div>
          </div>

          {/* Branch 2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
            <div className="md:col-span-4 order-1 md:order-1">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 block">02</span>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 uppercase">Yoga &<br/>Pilates</h3>
              <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed">
                Kontrol, denge, mobilite ve bedensel farkındalığa odaklanan çalışmalar.
              </p>
            </div>
            <div className="md:col-span-8 order-2 md:order-2 relative">
              <V3MediaPlaceholder label="YOGA & PILATES" aspectRatio="wide" className="w-full shadow-2xl" />
            </div>
          </div>

          {/* Branch 3 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
            <div className="md:col-span-8 order-2 md:order-1 relative">
              <V3MediaPlaceholder label="BOKS" aspectRatio="wide" className="w-full shadow-2xl" />
            </div>
            <div className="md:col-span-4 order-1 md:order-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 block">03</span>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 uppercase">Boks</h3>
              <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed">
                Teknik, kondisyon ve koordinasyonu bir araya getiren birebir çalışmalar.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
