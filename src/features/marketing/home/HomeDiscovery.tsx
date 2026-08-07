import { HomeMediaPlaceholder } from "./HomeMediaPlaceholder";

const DISCOVERY_ITEMS = [
  { id: 1, title: "PT", subtitle: "Personal Training", aspect: "video" as const, width: "w-[85vw] md:w-[50vw] lg:w-[40vw]" },
  { id: 2, title: "Fitness", subtitle: "Ekipman & Alan", aspect: "portrait" as const, width: "w-[75vw] md:w-[35vw] lg:w-[25vw]" },
  { id: 3, title: "Yoga & Pilates", subtitle: "Denge & Odak", aspect: "square" as const, width: "w-[80vw] md:w-[45vw] lg:w-[30vw]" },
  { id: 4, title: "Boks", subtitle: "Kondisyon", aspect: "portrait" as const, width: "w-[75vw] md:w-[35vw] lg:w-[25vw]" },
  { id: 5, title: "Vitamin Bar", subtitle: "Dinlenme", aspect: "video" as const, width: "w-[85vw] md:w-[50vw] lg:w-[40vw]" }
];

export function HomeDiscovery() {
  return (
    <section id="kesfet" className="py-20 md:py-32 bg-[#0A0A0A] overflow-hidden scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto px-6 lg:px-12 mb-12 md:mb-16">
        <div className="flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              SO3 / İÇERİDE
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-tight">
            SO3'ü keşfet.
          </h2>
          <p className="text-base md:text-lg text-white/60 font-medium max-w-lg mt-2">
            Kişiye özel antrenmanın gerçekleştiği alanları ve SO3 atmosferini yakından gör.
          </p>
        </div>
      </div>

      {/* Gallery Carousel (CSS only scroll) */}
      <div className="flex gap-4 md:gap-6 px-6 lg:px-12 w-full overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
        {DISCOVERY_ITEMS.map((item, index) => (
          <div key={item.id} className={`flex-none ${item.width} snap-center group cursor-pointer relative`}>
            <div className="rounded-lg overflow-hidden border border-white/10 relative">
              <HomeMediaPlaceholder label={item.title} aspectRatio={item.aspect} className="w-full transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
              
              <div className="absolute bottom-0 left-0 p-6 md:p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-[#851C35] mb-2 block">
                  0{index + 1}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-white/60 font-medium">
                  {item.subtitle}
                </p>
              </div>
              
              {/* Optional hover icon */}
              <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </div>
            </div>
          </div>
        ))}
        {/* Spacer for last item to align correctly */}
        <div className="flex-none w-6 lg:w-12"></div>
      </div>
    </section>
  );
}
