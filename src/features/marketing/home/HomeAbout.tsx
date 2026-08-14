import { type PublicAboutContent } from "@/features/homepage/publicHomepageContent";

interface HomeAboutProps {
  content: PublicAboutContent;
}

export function HomeAbout({ content }: HomeAboutProps) {
  return (
    <section id="hakkimizda" className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-[#F4F1EB] text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text */}
          <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                {content.eyebrow}
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight mb-2 leading-[1.15]">
              {content.headline_primary}<br/><span className="font-bold">{content.headline_emphasis}</span>
            </h2>

            <div className="flex flex-col gap-6 mt-4">
              <p className="text-lg md:text-xl font-medium tracking-tight leading-[1.5] text-[#0A0A0A]">
                {content.paragraph_primary}
              </p>
              
              <p className="text-base md:text-lg font-medium tracking-tight leading-[1.5] text-[#0A0A0A]/70">
                {content.paragraph_secondary}
              </p>
            </div>
          </div>

          {/* Right Column: YouTube Video */}
          <div className="w-full relative rounded-lg overflow-hidden border border-[#E5E3DB] aspect-video bg-[#0A0A0A] shadow-2xl group flex items-center justify-center">
            {content.youtube_video_id ? (
              <iframe
                className="w-full h-full absolute inset-0 border-0"
                src={`https://www.youtube-nocookie.com/embed/${content.youtube_video_id}?autoplay=0&rel=0&modestbranding=1`}
                title={content.youtube_title || "SO3 video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              ></iframe>
            ) : (
              <span className="text-white/30 text-sm font-medium tracking-widest uppercase">Video Bulunamadı</span>
            )}
          </div>
          
        </div>
      </div>
    </section>
  );
}
