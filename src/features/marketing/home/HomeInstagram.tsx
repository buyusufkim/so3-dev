import { type PublicInstagramSectionContent } from "@/features/homepage/publicHomepageContent";
import { useSiteSettings } from "@/features/site-settings/PublicSiteSettingsProvider";

interface HomeInstagramProps {
  content: PublicInstagramSectionContent;
}

export function HomeInstagram({ content }: HomeInstagramProps) {
  const { settings, loading } = useSiteSettings();
  const username = settings?.social?.instagram_username;
  return (
    <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-12 bg-white text-[#0A0A0A]">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#0A0A0A]/50">
                {content.eyebrow}
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-medium tracking-tight mb-6">
              {content.headline}
            </h2>
            {content.intro && (
              <p className="text-lg text-[#0A0A0A]/70 font-medium">
                {content.intro}
              </p>
            )}
          </div>
          
          <div className="shrink-0 w-full md:w-auto">
            {!loading && username && content.cta_label && (
              <a 
                href={`https://www.instagram.com/${username}/`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center justify-center bg-[#0A0A0A] text-white px-8 py-4 rounded text-sm font-semibold hover:bg-[#851C35] transition-colors w-full md:w-auto"
              >
                {content.cta_label}
                <svg className="ml-2 w-4 h-4 transform transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Reels Placeholder Container - Ready for Future API Integration */}
        <div className="w-full bg-[#F4F1EB] rounded-lg border border-[#E5E3DB] flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
           <svg className="w-12 h-12 text-[#0A0A0A]/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
             <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
             <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
           </svg>
           {content.placeholder_text && (
             <p className="text-sm font-medium text-[#0A0A0A]/50 max-w-sm">
               {content.placeholder_text}
             </p>
           )}
        </div>
      </div>
    </section>
  );
}
