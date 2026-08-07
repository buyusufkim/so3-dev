import { ConceptMediaPlaceholder } from "./ConceptMediaPlaceholder";

export function ConceptCommunity() {
  return (
    <section className="py-24 md:py-40 px-6 lg:px-12 bg-[#F0EFEA] text-[#111111]">
      <div className="container mx-auto">
        <div className="max-w-4xl mb-16 md:mb-24">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] mb-8">
            Antrenman biter.<br />
            SO3 devam eder.
          </h2>
          <p className="text-lg md:text-xl text-[#555555] font-normal leading-relaxed">
            SO3 birlikteliği salonla sınırlı kalmaz. Voleybol, doğa yürüyüşleri, kano ve piknik gibi etkinliklerde üyeler salon dışında da bir araya gelir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
          <div className="md:col-span-7 aspect-[4/3] md:aspect-auto md:h-[60vh]">
            <ConceptMediaPlaceholder label="Doğa Yürüyüşü" className="w-full h-full object-cover bg-[#E5E4DF] border-none text-[#888888]" />
          </div>
          <div className="md:col-span-5 flex flex-col gap-4 md:gap-8">
            <div className="aspect-[4/3] md:h-1/2 w-full">
              <ConceptMediaPlaceholder label="Voleybol Maçı" className="w-full h-full object-cover bg-[#E5E4DF] border-none text-[#888888]" />
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-8 h-1/2">
              <div className="aspect-square md:aspect-auto">
                <ConceptMediaPlaceholder label="Kano" className="w-full h-full object-cover bg-[#E5E4DF] border-none text-[#888888]" />
              </div>
              <div className="aspect-square md:aspect-auto">
                <ConceptMediaPlaceholder label="Piknik" className="w-full h-full object-cover bg-[#E5E4DF] border-none text-[#888888]" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 md:mt-16 flex justify-end">
          <a href="#" className="inline-flex items-center border-b border-[#222222] pb-2 hover:border-[#888888] transition-colors">
            <span className="text-sm font-medium tracking-wide">Topluluk etkinlikleri</span>
            <span className="ml-4">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
