import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function FitnessSection() {
  return (
    <section id="fitness" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#0A0A0A] text-white scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          <div className="order-2 lg:order-1 flex flex-col gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#851C35]">01</span>
              <span className="w-8 h-[1px] bg-white/20"></span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-[0.9]">Fitness</h2>
            <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed max-w-lg">
              Güç, kondisyon ve kişisel hedeflerine göre şekillenen antrenmanlar.
            </p>
            <div className="pt-6 border-t border-white/10 mt-2">
              <p className="text-sm md:text-base text-white/50 leading-relaxed max-w-lg">
                SO3'te fitness süreci kişiye özel planlanır ve çalıştığın eğitmenle birlikte ilerler.
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2 rounded-lg overflow-hidden border border-white/10 relative h-[400px] md:h-[600px] w-full">
            <HomeMediaPlaceholder label="FİTNESS FOTOĞRAF" aspectRatio="auto" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
