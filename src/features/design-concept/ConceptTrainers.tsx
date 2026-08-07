import { ConceptMediaPlaceholder } from "./ConceptMediaPlaceholder";

export function ConceptTrainers() {
  return (
    <section className="py-24 md:py-40 px-6 lg:px-12 bg-[#F9F9F9] text-[#050505]">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 md:mb-24 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] mb-6">
              Kişisel antrenman, kişisel ilgiyi gerektirir.
            </h2>
            <p className="text-lg md:text-xl text-[#444444] font-normal leading-relaxed">
              Doğru takip, doğru iletişimle başlar. SO3’te antrenman sürecin, çalıştığın eğitmenle birlikte şekillenir.
            </p>
          </div>
          <div>
            <a href="#" className="group flex items-center border-b border-[#222222] pb-2 hover:border-[#888888] transition-colors">
              <span className="text-sm font-medium tracking-wide">Kadroyu keşfet</span>
              <span className="ml-4 transform transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col group cursor-pointer">
              <div className="aspect-[3/4] w-full overflow-hidden bg-[#EEEEEE] mb-4">
                <ConceptMediaPlaceholder label="Eğitmen Portre" aspectRatio="portrait" className="w-full h-full mix-blend-multiply opacity-80 group-hover:opacity-100 transition-opacity bg-transparent border-none text-[#999999]" />
              </div>
              <div className="flex justify-between items-center border-t border-[#DDDDDD] pt-3">
                <span className="text-sm font-medium">İsim {i}</span>
                <span className="text-xs text-[#888888]">Branş</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
