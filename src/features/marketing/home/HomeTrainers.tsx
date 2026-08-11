import { HomeMediaPlaceholder } from "./HomeMediaPlaceholder";
import { useRef } from "react";

type Trainer = {
  name: string;
  discipline: string;
  image?: string;
  instagram?: string;
};

const TRAINERS: Trainer[] = [
  { name: "Yusuf Açık", discipline: "Boks" },
  { name: "Mehmet Ateş", discipline: "Boks" },
  { name: "İrem", discipline: "Yoga" },
  { name: "Gamze Arslan", discipline: "Yoga" },
  { name: "Müniyra Karayağız", discipline: "Pilates" },
  { name: "Almira Tektaş", discipline: "Pilates" },
  { name: "Selami Özyıldırım", discipline: "Fitness" },
  { name: "Selim Özyıldırım", discipline: "Fitness" },
  { name: "Sencer Özyıldırım", discipline: "Fitness" },
  { name: "Eren Sencer Öztürk", discipline: "Fitness" },
  { name: "Hulusi Ünlü", discipline: "Fitness" },
  { 
    name: "Mehmet Katipoğlu", 
    discipline: "Uzman Diyetisyen", 
    instagram: "https://www.instagram.com/uzm.dyt.mehmetkatipoglu/"
  }
];

export function HomeTrainers() {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="egitmenler" className="py-24 md:py-32 bg-white text-[#0A0A0A] scroll-mt-24 md:scroll-mt-28 overflow-hidden">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                SO3 / EKİP
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-tight">
              Doğru insanla çalış.
            </h2>
            <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium leading-relaxed">
              Kişisel antrenman, kişisel ilgiyi gerektirir. Sürecin, çalıştığın eğitmenle birlikte şekillenir.
            </p>
          </div>
          
          <div className="hidden md:flex gap-4 items-center">
            <button 
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/50"
              aria-label="Önceki eğitmenler"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/50"
              aria-label="Sonraki eğitmenler"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Full Bleed Rail Container */}
      <div className="w-full relative pl-4 sm:pl-6 lg:pl-12 container mx-auto max-w-7xl md:pr-0">
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-8 snap-x snap-mandatory hide-scrollbar pr-4 md:pr-12"
          style={{ scrollBehavior: 'smooth' }}
        >
          {TRAINERS.map((trainer, index) => (
            <div 
              key={index} 
              className="flex-none w-[85vw] sm:w-[calc(50vw-2rem)] md:w-[calc(33.333vw-2rem)] max-w-[400px] snap-start flex flex-col group relative"
            >
              <div className="relative overflow-hidden bg-[#F4F1EB] border border-[#E5E3DB] aspect-[3/4] mb-4 rounded-sm">
                <HomeMediaPlaceholder label="EĞİTMEN PORTRE" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" light />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              
              <div className="flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight uppercase leading-none break-words">
                    {trainer.name}
                  </h3>
                  {trainer.instagram && (
                    <a 
                      href={trainer.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#0A0A0A]/50 hover:text-[#851C35] transition-colors shrink-0 pt-0.5"
                      aria-label={`${trainer.name} Instagram`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#0A0A0A]/50 uppercase tracking-widest mt-2">
                  {trainer.discipline}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
