import { useState, useEffect } from "react";
import { BranchLightbox } from "./BranchLightbox";
import { type PublicBranchesSectionContent } from "@/features/homepage/publicHomepageContent";
import { type PublicBranch, parsePublicBranchesResponse } from "@/features/branches/publicBranches";
import { HomeMediaPlaceholder } from "./HomeMediaPlaceholder";

interface HomeBranchesProps {
  content: PublicBranchesSectionContent;
}

export function HomeBranches({ content }: HomeBranchesProps) {
  const [activeBranch, setActiveBranch] = useState<PublicBranch | null>(null);
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchBranches() {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/public/branches");
        if (!res.ok) throw new Error("Failed to fetch branches");
        
        const json: unknown = await res.json();
        const parsedBranches = parsePublicBranchesResponse(json);
        if (mounted) {
          setBranches(parsedBranches);
        }
      } catch (err) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchBranches();
    
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="branslar" className="py-20 md:py-24 px-4 sm:px-6 lg:px-12 bg-[#0A0A0A] text-white scroll-mt-24 md:scroll-mt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#851C35]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                {content.eyebrow}
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-tight">
              {content.headline_primary}<br />
              <span className="font-bold">{content.headline_emphasis}</span>
            </h2>
          </div>
        </div>

        {/* CONTENT STATES */}
        {loading && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
             {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-[260px] md:h-[300px] lg:col-span-6 bg-white/5 animate-pulse rounded-md border border-white/10`}></div>
             ))}
           </div>
        )}

        {!loading && error && (
           <div className="w-full py-16 flex items-center justify-center border border-white/10 rounded-md bg-white/5">
             <p className="text-white/50 font-medium">Branşlar şu anda görüntülenemiyor.</p>
           </div>
        )}

        {!loading && !error && branches.length === 0 && (
           <div className="w-full py-16 flex items-center justify-center border border-white/10 rounded-md bg-white/5">
             <p className="text-white/50 font-medium">Şu anda görüntülenecek aktif branş bulunmuyor.</p>
           </div>
        )}

        {/* EDITORIAL GRID LAYOUT */}
        {!loading && !error && branches.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
            {branches.map((branch, idx) => {
              // 0 -> 7, 1 -> 5, 2 -> 5, 3 -> 7 pattern
              let desktopSpan = "";
              let desktopHeight = "lg:h-[300px]"; // default fallback
              
              const layoutIdx = idx % 4;
              
              if (layoutIdx === 0) { 
                desktopSpan = "lg:col-span-7";
                desktopHeight = "lg:h-[320px]";
              } else if (layoutIdx === 1) { 
                desktopSpan = "lg:col-span-5";
                desktopHeight = "lg:h-[320px]";
              } else if (layoutIdx === 2) { 
                desktopSpan = "lg:col-span-5";
                desktopHeight = "lg:h-[290px]";
              } else if (layoutIdx === 3) { 
                desktopSpan = "lg:col-span-7";
                desktopHeight = "lg:h-[290px]";
              }

              const hasGallery = branch.gallery.length > 0;

              return (
                <div 
                  key={branch.slug}
                  className={`h-[260px] md:h-[300px] ${desktopHeight} ${desktopSpan} group relative rounded-md overflow-hidden border border-white/10 flex flex-col justify-end p-5 ${hasGallery ? 'cursor-pointer' : ''}`}
                  onClick={() => hasGallery && setActiveBranch(branch)}
                  role={hasGallery ? "button" : "region"}
                  tabIndex={hasGallery ? 0 : -1}
                  onKeyDown={(e) => hasGallery && e.key === 'Enter' && setActiveBranch(branch)}
                  aria-label={hasGallery ? `${branch.name} galerisini aç` : branch.name}
                >
                  <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                    {branch.cover?.url ? (
                      <img 
                        src={branch.cover.url} 
                        alt={branch.cover.alt_text || `${branch.name} branşı`} 
                        loading="lazy" 
                        className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-100 object-center" 
                      />
                    ) : (
                      <div className="w-full h-full bg-[#111] flex items-center justify-center">
                         <HomeMediaPlaceholder label="SO3" className="w-full h-full object-cover opacity-40 grayscale" />
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent z-10 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                  {hasGallery && (
                    <div className="absolute inset-0 bg-[#851C35]/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  )}
                  
                  <div className="relative z-20 flex justify-between items-end w-full">
                    <div className="flex-1 pr-4">
                      <div className="flex items-baseline gap-3 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                          0{idx + 1}
                        </span>
                        <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                          {branch.name}
                        </h3>
                      </div>
                      <p className="text-sm text-white/70 max-w-[260px] font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
                        {branch.description}
                      </p>
                    </div>
                    {hasGallery && (
                      <div className="flex-none flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                        {content.gallery_cta_label && <span className="hidden sm:inline-block">{content.gallery_cta_label}</span>}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BranchLightbox 
        key={activeBranch?.slug ?? "closed"}
        isOpen={activeBranch !== null}
        onClose={() => setActiveBranch(null)}
        images={activeBranch?.gallery.map(g => g.url) || []}
        title={activeBranch?.name || ""}
      />
    </section>
  );
}
