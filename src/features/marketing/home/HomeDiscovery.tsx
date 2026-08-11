const DISCOVERY_ITEMS = [
  { id: 1, title: "PT", subtitle: "Personal Training", aspect: "aspect-video", width: "w-[85vw] md:w-[50vw] lg:w-[40vw]", image: "/media/so3/discovery-pt.webp", alt: "SO3 birebir personal training" },
  { id: 2, title: "Fitness", subtitle: "Ekipman & Alan", aspect: "aspect-[3/4]", width: "w-[75vw] md:w-[35vw] lg:w-[25vw]", image: "/media/so3/discovery-fitness.webp", alt: "SO3 fitness alanı" },
  { id: 3, title: "Yoga & Pilates", subtitle: "Denge & Odak", aspect: "aspect-square", width: "w-[80vw] md:w-[45vw] lg:w-[30vw]", image: "/media/so3/discovery-yoga.webp", alt: "SO3 yoga ve pilates alanı" },
  { id: 4, title: "Boks", subtitle: "Kondisyon", aspect: "aspect-[3/4]", width: "w-[75vw] md:w-[35vw] lg:w-[25vw]", image: "/media/so3/discovery-boxing.webp", alt: "SO3 boks alanı" },
  { id: 5, title: "Vitamin Bar", subtitle: "Dinlenme", aspect: "aspect-video", width: "w-[85vw] md:w-[50vw] lg:w-[40vw]", image: "/media/so3/discovery-vitamin-bar.webp", alt: "SO3 vitamin bar" }
];

export function HomeDiscovery() {
  return (
    <section id="kesfet" className="py-20 md:py-32 bg-[#0A0A0A] bg-so3-grain overflow-hidden scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto px-6 lg:px-12 mb-12 md:mb-16 relative z-10">
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
          <div key={item.id} className={`flex-none ${item.width} snap-center group relative`}>
            <div className="rounded-lg overflow-hidden border border-white/10 relative">
              <img 
                src={item.image} 
                alt={item.alt} 
                loading="lazy" 
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${item.aspect}`} 
              />
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
            </div>
          </div>
        ))}
        {/* Spacer for last item to align correctly */}
        <div className="flex-none w-6 lg:w-12"></div>
      </div>
    </section>
  );
}
