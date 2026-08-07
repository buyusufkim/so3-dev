import { HomeMediaPlaceholder } from "../home/HomeMediaPlaceholder";

export function YogaPilatesSection() {
  return (
    <section id="yoga-pilates" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:gap-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#851C35]">02</span>
                <span className="w-8 h-[1px] bg-[#0A0A0A]/20"></span>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter leading-[0.9] mb-6">
                Yoga &<br />Pilates
              </h2>
              <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium leading-relaxed max-w-lg">
                Kontrol, denge, mobilite ve bedensel farkındalığa odaklanan çalışmalar.
              </p>
            </div>
            <div className="max-w-sm md:text-right">
              <p className="text-sm md:text-base text-[#0A0A0A]/60 leading-relaxed">
                Çalışmalar, kişisel hedef ve çalışma biçimine göre eğitmen eşliğinde şekillenir.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            <div className="md:col-span-8 rounded-lg overflow-hidden border border-[#0A0A0A]/10 relative h-[350px] md:h-[500px]">
              <HomeMediaPlaceholder label="YOGA & PİLATES ANA GÖRSEL" aspectRatio="auto" className="w-full h-full" light />
            </div>
            <div className="md:col-span-4 rounded-lg overflow-hidden border border-[#0A0A0A]/10 relative h-[250px] md:h-[500px]">
              <HomeMediaPlaceholder label="YOGA & PİLATES DETAY" aspectRatio="auto" className="w-full h-full" light />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
