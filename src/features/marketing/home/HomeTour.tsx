import { useState } from "react";
import { MatterportViewer } from "../tour/MatterportViewer";

export function HomeTour() {
  const [isTourActive, setIsTourActive] = useState(false);

  return (
    <section id="tour" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#050505] text-white scroll-mt-24 md:scroll-mt-28">
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
              className="flex items-center justify-center bg-white text-black px-6 py-4 rounded text-sm font-semibold hover:bg-[#851C35] hover:text-white transition-all group"
            >
              <span>360° turu başlat</span>
              <span className="ml-3 transform transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>

        <MatterportViewer 
          className="aspect-video min-h-[400px]" 
          isActive={isTourActive} 
          onPlay={() => setIsTourActive(true)} 
        />
      </div>
    </section>
  );
}
