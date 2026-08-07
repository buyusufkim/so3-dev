import { ConceptMediaPlaceholder } from "./ConceptMediaPlaceholder";

export function ConceptBranches() {
  return (
    <section className="py-24 md:py-40 px-6 lg:px-12 bg-[#0A0A0A] border-t border-[#1A1A1A]">
      <div className="container mx-auto">
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-[#F9F9F9] mb-20 max-w-xl">
          Hedef değişir. Merkezde yine sen varsın.
        </h2>

        <div className="flex flex-col space-y-32">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 md:col-start-1 order-2 md:order-1">
              <h3 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-4">Fitness</h3>
              <p className="text-[#888888] text-lg font-normal leading-relaxed">
                Güç, kondisyon ve kişisel hedeflerine göre şekillenen antrenmanlar.
              </p>
            </div>
            <div className="md:col-span-7 md:col-start-6 order-1 md:order-2 h-[50vh] md:h-[70vh]">
              <ConceptMediaPlaceholder label="Fitness Editorial" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 md:col-start-1 h-[50vh] md:h-[70vh]">
              <ConceptMediaPlaceholder label="Yoga & Pilates" className="w-full h-full object-cover" />
            </div>
            <div className="md:col-span-4 md:col-start-9">
              <h3 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-4">Yoga & Pilates</h3>
              <p className="text-[#888888] text-lg font-normal leading-relaxed">
                Kontrol, denge, mobilite ve bedensel farkındalığa odaklanan çalışmalar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4 md:col-start-1 order-2 md:order-1">
              <h3 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-4">Boks</h3>
              <p className="text-[#888888] text-lg font-normal leading-relaxed">
                Teknik, kondisyon ve koordinasyonu bir araya getiren birebir çalışmalar.
              </p>
            </div>
            <div className="md:col-span-7 md:col-start-6 order-1 md:order-2 h-[50vh] md:h-[70vh]">
              <ConceptMediaPlaceholder label="Boxing Editorial" className="w-full h-full object-cover" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
