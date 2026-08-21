import { type PublicWhySo3Content } from "@/features/homepage/publicHomepageContent";

interface HomeWhySO3Props {
  content: PublicWhySo3Content;
}

export function HomeWhySO3({ content }: HomeWhySO3Props) {
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        
        {/* Header section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 md:mb-24 gap-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                {content.eyebrow}
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-medium tracking-tight leading-[1.05]">
              {content.headline_primary}<br />
              <span className="font-bold">{content.headline_emphasis}</span>
            </h2>
          </div>
          
          <div className="max-w-sm lg:pb-4">
            <p className="text-lg md:text-xl text-[#0A0A0A]/70 font-medium leading-relaxed">
              {content.intro}
            </p>
          </div>
        </div>

        {/* Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {content.items.map((val, idx) => {
            const num = (idx + 1).toString().padStart(2, '0');
            return (
              <div 
                key={idx} 
                className="bg-white rounded-lg p-8 md:p-10 border border-[#E5E3DB] flex flex-col group hover:border-[#851C35]/30 hover:shadow-xl hover:shadow-[#0A0A0A]/5 transition-all duration-300"
              >
                <div className="mb-8 md:mb-10">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#851C35]">
                    {num}
                  </span>
                </div>

                <h3 className="text-2xl font-bold tracking-tight leading-tight">
                  {val.title}
                </h3>
                <p className="mt-auto pt-8 text-[#0A0A0A]/60 font-medium leading-relaxed text-sm md:text-base">
                  {val.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
