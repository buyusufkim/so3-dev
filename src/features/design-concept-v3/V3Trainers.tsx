import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Trainers() {
  return (
    <section className="py-24 md:py-48 px-6 lg:px-12 bg-white text-[#09090B]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 md:mb-24 gap-12">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#09090B]/40 mb-6 block">
              SO3 / EKİP
            </span>
            <h2 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight mb-8 leading-[0.95]">
              Doğru insanla çalış.
            </h2>
            <p className="text-xl md:text-2xl text-[#09090B]/70 font-medium leading-relaxed">
              Kişisel antrenman, kişisel ilgiyi gerektirir. Sürecin, çalıştığın eğitmenle birlikte şekillenir.
            </p>
          </div>
          
          <div className="hidden md:block">
            <a href="#" className="inline-flex items-center text-sm font-bold uppercase tracking-widest border-b-2 border-[#09090B] pb-2 hover:text-[#09090B]/60 hover:border-[#09090B]/60 transition-colors">
              Kadroyu keşfet <span className="ml-4">→</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
          <div className="md:col-span-4 flex flex-col group cursor-pointer">
            <V3MediaPlaceholder label="EĞİTMEN PORTRE 1" aspectRatio="portrait" className="w-full mb-6" />
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-2xl font-bold tracking-tight">İsim</h4>
                <p className="text-sm font-medium text-[#09090B]/50 uppercase tracking-widest mt-1">Branş</p>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-4 flex flex-col group cursor-pointer md:mt-16">
            <V3MediaPlaceholder label="EĞİTMEN PORTRE 2" aspectRatio="portrait" className="w-full mb-6" />
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-2xl font-bold tracking-tight">İsim</h4>
                <p className="text-sm font-medium text-[#09090B]/50 uppercase tracking-widest mt-1">Branş</p>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-4 flex flex-col group cursor-pointer">
            <V3MediaPlaceholder label="EĞİTMEN PORTRE 3" aspectRatio="portrait" className="w-full mb-6" />
            <div className="flex justify-between items-end">
              <div>
                <h4 className="text-2xl font-bold tracking-tight">İsim</h4>
                <p className="text-sm font-medium text-[#09090B]/50 uppercase tracking-widest mt-1">Branş</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 block md:hidden">
            <a href="#" className="inline-flex items-center text-sm font-bold uppercase tracking-widest border-b-2 border-[#09090B] pb-2 hover:text-[#09090B]/60 hover:border-[#09090B]/60 transition-colors">
              Kadroyu keşfet <span className="ml-4">→</span>
            </a>
          </div>
      </div>
    </section>
  );
}
