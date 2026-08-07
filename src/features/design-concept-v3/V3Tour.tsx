import { useState } from "react";
import { V3MediaPlaceholder } from "./V3MediaPlaceholder";

export function V3Tour() {
  const [isTourActive, setIsTourActive] = useState(false);

  return (
    <section className="py-24 md:py-48 px-6 lg:px-12 bg-[#09090B] text-white">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-16 md:mb-24 gap-12">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[0.95] mb-6">
              SO3'ün içinde dolaş.
            </h2>
            <p className="text-xl text-white/60 font-medium leading-relaxed">
              Antrenman alanlarını gelmeden önce 360° sanal turla keşfet.
            </p>
          </div>
          <div className="hidden lg:block">
            <button onClick={() => setIsTourActive(true)} className="inline-flex items-center text-sm font-bold uppercase tracking-widest border-b-2 border-white pb-2 hover:text-white/60 hover:border-white/60 transition-colors">
              360° turu başlat <span className="ml-4">→</span>
            </button>
          </div>
        </div>

        <div className="relative w-full aspect-video min-h-[50vh] max-h-[85vh] bg-[#18181B] overflow-hidden">
          {!isTourActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center group cursor-pointer" onClick={() => setIsTourActive(true)}>
              <V3MediaPlaceholder label="360° MEKÂN GÖRSELİ" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center lg:hidden">
                <span className="inline-flex items-center bg-white text-black px-6 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F4F4F0] transition-colors">
                  Turu başlat <span className="ml-2">→</span>
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
