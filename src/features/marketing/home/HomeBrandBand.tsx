import { useEffect, useState } from "react";

const SERVICES = [
  "Kişisel Diyetisyen ve Beslenme Programı",
  "Supplement Danışmanlığı",
  "Birebir Dersler",
  "Kişiye Özel Program",
  "Özel Etkinlikler",
  "Profesyonel Eğitmenler",
];

export function HomeBrandBand() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="w-full bg-[#0A0A0A] text-white/90 py-3 md:py-4 overflow-hidden flex items-center border-y border-[#851C35]/30">
      {isReducedMotion ? (
        <div className="container mx-auto px-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-center">
          {SERVICES.map((service, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="text-xs md:text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                {service}
              </span>
              {idx !== SERVICES.length - 1 && (
                <span className="text-[#851C35] font-bold hidden md:inline">·</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative flex overflow-x-hidden group w-full">
          <div className="flex whitespace-nowrap w-max">
            {/* We render two identical track elements to create a seamless loop */}
            {[0, 1].map((trackIndex) => (
              <div 
                key={trackIndex} 
                className="flex w-max shrink-0 animate-marquee items-center justify-start group-hover:[animation-play-state:paused]"
              >
                {SERVICES.map((service, idx) => (
                  <div key={`${trackIndex}-${idx}`} className="flex items-center shrink-0">
                    <span className="text-xs md:text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                      {service}
                    </span>
                    <span className="text-[#851C35] font-bold text-lg md:text-xl ml-2 md:ml-3 mr-3 md:mr-5">·</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
