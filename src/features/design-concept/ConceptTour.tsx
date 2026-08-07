import { useState } from "react";
import { ConceptMediaPlaceholder } from "./ConceptMediaPlaceholder";

export function ConceptTour() {
  const [isTourActive, setIsTourActive] = useState(false);

  return (
    <section className="py-24 md:py-40 px-6 lg:px-12 bg-[#050505] text-white">
      <div className="container mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight mb-6">
            Atmosferi keşfet.
          </h2>
          <p className="text-lg text-[#888888] font-normal">
            SO3'ün antrenman alanlarını gelmeden önce 360° sanal turla keşfet.
          </p>
        </div>

        <div className="relative w-full aspect-video max-h-[80vh] bg-[#111111] overflow-hidden">
          {!isTourActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center group cursor-pointer" onClick={() => setIsTourActive(true)}>
              <ConceptMediaPlaceholder label="360° Mekan Görseli" className="w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity border-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex items-center bg-white text-black px-6 py-3 text-sm font-medium tracking-wide hover:bg-[#E5E5E5] transition-colors">
                  360° turu başlat <span className="ml-2">→</span>
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
