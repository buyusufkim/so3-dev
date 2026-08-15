import { type PublicTourSectionContent } from "@/features/homepage/publicHomepageContent";
import { MatterportViewer } from "../tour/MatterportViewer";

interface HomeTourProps {
  content: PublicTourSectionContent;
}

export function HomeTour({ content }: HomeTourProps) {
  return (
    <section id="tour" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#050505] bg-so3-grain text-white scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 md:mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                {content.eyebrow}
              </span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight mb-4">
              {content.headline}
            </h2>
            {content.intro && (
              <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed">
                {content.intro}
              </p>
            )}
          </div>
        </div>

        <MatterportViewer 
          className="aspect-video min-h-[400px] lg:min-h-[600px]" 
        />
      </div>
    </section>
  );
}
