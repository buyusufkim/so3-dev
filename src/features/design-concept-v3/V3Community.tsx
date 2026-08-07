import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Community() {
  return (
    <section className="py-24 md:py-48 px-6 lg:px-12 bg-[#F7F7F5] text-[#09090B]">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-4xl mx-auto mb-20 md:mb-32">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#09090B]/40 mb-6 block">
            SO3 / COMMUNITY
          </span>
          <h2 className="text-5xl sm:text-6xl md:text-[5.5rem] lg:text-[6.5rem] font-medium tracking-tight leading-[0.95] mb-8">
            Antrenman biter.<br />
            SO3 devam eder.
          </h2>
          <p className="text-xl md:text-2xl text-[#09090B]/60 font-medium max-w-2xl mx-auto">
            SO3 birlikteliği salonla sınırlı kalmaz. Voleybol, doğa yürüyüşü, kano ve piknik gibi etkinliklerde üyeler salon dışında da bir araya gelir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 mb-16">
          <div className="md:col-span-8 h-[40vh] md:h-[60vh]">
            <V3MediaPlaceholder label="DOĞA YÜRÜYÜŞÜ / KANO" className="w-full h-full !bg-[#E5E5E5] !border-none !text-[#09090B]/30" />
          </div>
          <div className="md:col-span-4 flex flex-col gap-4 md:gap-8">
            <div className="h-[30vh] md:h-[calc(30vh-1rem)]">
              <V3MediaPlaceholder label="VOLEYBOL" className="w-full h-full !bg-[#E5E5E5] !border-none !text-[#09090B]/30" />
            </div>
            <div className="h-[30vh] md:h-[calc(30vh-1rem)]">
              <V3MediaPlaceholder label="PİKNİK" className="w-full h-full !bg-[#E5E5E5] !border-none !text-[#09090B]/30" />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <a href="#" className="inline-flex items-center text-sm font-bold uppercase tracking-widest border-b-2 border-[#09090B] pb-2 hover:text-[#09090B]/60 hover:border-[#09090B]/60 transition-colors">
            Topluluk etkinlikleri <span className="ml-4">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
