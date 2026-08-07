import { V31MediaPlaceholder } from "./V31MediaPlaceholder";

const TRAINERS = [
  { id: 1, name: "Eğitmen İsmi", role: "Fitness & Kondisyon" },
  { id: 2, name: "Eğitmen İsmi", role: "Yoga & Pilates" },
  { id: 3, name: "Eğitmen İsmi", role: "Boks & Kickboks" },
  { id: 4, name: "Eğitmen İsmi", role: "Fonksiyonel" },
];

export function V31Trainers() {
  return (
    <section id="egitmenler" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-24 gap-8">
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
          
          <div className="hidden md:block">
            <a href="#" className="group flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]">
              <span className="relative">
                Tüm Ekibi Gör
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#0A0A0A] transition-all group-hover:w-full"></span>
              </span>
              <span className="w-6 h-6 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center transform group-hover:translate-x-1 group-hover:border-[#0A0A0A] transition-all">
                →
              </span>
            </a>
          </div>
        </div>

        {/* Trainers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TRAINERS.map((trainer) => (
            <div key={trainer.id} className="flex flex-col group cursor-pointer">
              <div className="relative overflow-hidden bg-[#F4F1EB] mb-6 border border-[#E5E3DB]">
                <V31MediaPlaceholder label="EĞİTMEN PORTRE" aspectRatio="portrait" light className="w-full transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl md:text-2xl font-bold tracking-tight text-[#0A0A0A] mb-1 group-hover:text-[#851C35] transition-colors">{trainer.name}</h4>
                  <p className="text-[11px] font-bold text-[#0A0A0A]/50 uppercase tracking-[0.15em]">{trainer.role}</p>
                </div>
                <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#851C35]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 block md:hidden">
          <a href="#" className="group flex items-center justify-between border-b border-[#0A0A0A]/20 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]">Tüm Ekibi Gör</span>
            <span className="text-[#0A0A0A] transform group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
