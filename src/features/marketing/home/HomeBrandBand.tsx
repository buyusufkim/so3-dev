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
    <div className="w-full bg-[#0A0A0A] text-white/90 py-4 md:py-5 overflow-hidden flex items-center border-y border-[#851C35]/30">
      {isReducedMotion ? (
        <div className="container mx-auto px-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-center">
          {SERVICES.map((service, idx) => (
            <div key={idx} className="flex items-center gap-6">
              <span className="text-xs md:text-sm font-semibold uppercase tracking-wider whitespace-nowrap">
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
                className="flex min-w-full shrink-0 animate-marquee items-center justify-around gap-8 md:gap-12 px-4 md:px-6 group-hover:[animation-play-state:paused]"
              >
                {SERVICES.map((service, idx) => (
                  <div key={`${trackIndex}-${idx}`} className="flex items-center gap-8 md:gap-12 shrink-0">
                    <span className="text-xs md:text-sm font-semibold uppercase tracking-wider">
                      {service}
                    </span>
                    <span className="text-[#851C35] font-bold">·</span>
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
