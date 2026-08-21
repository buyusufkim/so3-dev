import { type PublicPerformanceContent } from "@/features/homepage/publicHomepageContent";

interface HomePerformanceProps {
  content: PublicPerformanceContent;
}

export function HomePerformance({ content }: HomePerformanceProps) {
  return (
    <section className="relative min-h-[60vh] flex items-center bg-[#050505] overflow-hidden">
      <div className="absolute inset-0 z-0">
        {content.background ? (
          <img 
            src={content.background.url} 
            alt={content.background.alt_text ?? ""} 
            loading="lazy" 
            className="w-full h-full object-cover opacity-50 mix-blend-luminosity" 
          />
        ) : null}
      </div>
      
      <div className="absolute inset-0 bg-[#050505]/40 z-10"></div>
      
      <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-12 py-20 md:py-24 flex flex-col justify-end h-full">
        <div className="max-w-4xl border-l-2 border-[#851C35] pl-6 md:pl-10">
          <h2 className="text-5xl sm:text-6xl md:text-[5.5rem] lg:text-[7rem] font-bold tracking-tighter text-white mb-6 md:mb-8 leading-[0.9]">
            {content.headline_primary} <br />
            {content.headline_emphasis}
          </h2>
          <p className="text-lg md:text-xl text-white/80 font-medium leading-relaxed max-w-2xl">
            {content.description}
          </p>
        </div>
      </div>
    </section>
  );
}
