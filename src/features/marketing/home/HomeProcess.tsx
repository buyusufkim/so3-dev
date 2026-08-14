import { type PublicProcessContent } from "@/features/homepage/publicHomepageContent";

interface HomeProcessProps {
  content: PublicProcessContent;
}

export function HomeProcess({ content }: HomeProcessProps) {
  const hasHeadline = content.headline_primary || content.headline_emphasis;

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#121212] text-white">
      <div className="container mx-auto max-w-7xl">
        
        <div className="mb-16 md:mb-24">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              {content.eyebrow}
            </span>
          </div>
          {hasHeadline && (
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight max-w-2xl">
              {content.headline_primary && (
                <>
                  {content.headline_primary}
                  {content.headline_emphasis && <br />}
                </>
              )}
              {content.headline_emphasis && (
                <span className="font-bold">{content.headline_emphasis}</span>
              )}
            </h2>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-white/10">
          {content.steps.map((step, idx) => {
            const num = (idx + 1).toString().padStart(2, '0');
            return (
              <div key={idx} className="flex flex-col border-r border-b border-white/10 p-8 md:p-10 hover:bg-white/[0.02] transition-colors min-h-[240px]">
                <span className="text-[#851C35] font-bold text-2xl mb-8">{num}</span>
                <h3 className="text-2xl font-medium tracking-tight text-white mt-auto">
                  {step.title}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
