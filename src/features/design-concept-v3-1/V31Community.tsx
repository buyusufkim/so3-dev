import { V31MediaPlaceholder } from "./V31MediaPlaceholder";

export function V31Community() {
  return (
    <section id="topluluk" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-24">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
              SO3 / COMMUNITY
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05] mb-8">
            Antrenman biter.<br />
            <span className="font-bold">SO3 devam eder.</span>
          </h2>
          <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium max-w-2xl mx-auto">
            SO3 birlikteliği salonla sınırlı kalmaz. Voleybol, doğa yürüyüşü, kano ve piknik gibi etkinliklerde üyeler salon dışında da bir araya gelir.
          </p>
        </div>

        {/* Community Photo Collage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mb-16">
          
          <div className="md:col-span-8 group relative rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[300px] md:min-h-[500px]">
            <V31MediaPlaceholder label="KANO / DOĞA" light className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]">Doğa Yürüyüşü</span>
            </div>
          </div>
          
          <div className="md:col-span-4 flex flex-col gap-4 md:gap-6">
            <div className="flex-1 group relative rounded-lg overflow-hidden border border-[#E5E3DB] min-h-[250px]">
              <V31MediaPlaceholder label="VOLEYBOL" light className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A]">Voleybol Turnuvası</span>
              </div>
            </div>
            
            <div className="flex-1 bg-[#0A0A0A] rounded-lg border border-[#0A0A0A] p-8 flex flex-col justify-center min-h-[250px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#851C35] mb-4">ETKİNLİKLER</span>
              <h3 className="text-2xl font-bold tracking-tight text-white mb-4">Spor salonunun<br/>ötesinde.</h3>
              <a href="#" className="mt-auto group flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 hover:text-white transition-colors">
                <span className="relative">
                  Daha fazlasını gör
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full"></span>
                </span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
