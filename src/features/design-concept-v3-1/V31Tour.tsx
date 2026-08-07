import { useState } from "react";
import { V31MediaPlaceholder } from "./V31MediaPlaceholder";

export function V31Tour() {
  const [isTourActive, setIsTourActive] = useState(false);

  return (
    <section id="tour" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#050505] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 md:mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                360° SANAL TUR
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight mb-4">
              SO3'ün içinde dolaş.
            </h2>
            <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed">
              Antrenman alanlarını gelmeden önce sanal turla keşfet.
            </p>
          </div>
          
          <div className="hidden lg:block">
            <button 
              onClick={() => setIsTourActive(true)} 
              className="flex items-center justify-center bg-white text-black px-6 py-4 rounded text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#851C35] hover:text-white transition-all group"
            >
              <span>Turu Başlat</span>
              <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>

        <div className="relative w-full aspect-video min-h-[400px] rounded-lg bg-[#0F0F0F] overflow-hidden border border-white/10 shadow-2xl">
          {!isTourActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center group cursor-pointer" onClick={() => setIsTourActive(true)}>
              <V31MediaPlaceholder label="360° MEKÂN GÖRSELİ" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#851C35] text-white flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(133,28,53,0.4)] group-hover:scale-110 transition-transform">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-2"><path d="M5 3l14 9-14 9V3z"/></svg>
                </div>
                <span className="lg:hidden flex items-center bg-white text-black px-6 py-4 rounded text-[11px] font-bold uppercase tracking-[0.15em]">
                  Turu Başlat <span className="ml-2">→</span>
                </span>
              </div>
            </div>
          ) : (
            <iframe
              src="https://my.matterport.com/show/?m=sXAzAwRLnGs"
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              allow="xr-spatial-tracking"
              title="SO3 PT 360 Virtual Tour"
            ></iframe>
          )}
        </div>
      </div>
    </section>
  );
}
